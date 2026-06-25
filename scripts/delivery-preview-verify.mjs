const baseUrl = (process.env.DELIVERY_PREVIEW_URL || "").replace(/\/$/, "")
const email = process.env.DELIVERY_QA_EMAIL || "delivery.driver.qa@elitempsb.com"
const password = process.env.DELIVERY_QA_PASSWORD || ""
const expectedBranch =
  process.env.DELIVERY_EXPECTED_BRANCH || "codex/delivery-v1-deploy-ready"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function decodeEntities(value) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
}

function mergeCookies(currentCookie, headers) {
  const incoming = headers.getSetCookie ? headers.getSetCookie() : []

  if (incoming.length === 0) {
    return currentCookie
  }

  const cookies = new Map(
    currentCookie
      .split("; ")
      .filter(Boolean)
      .map((cookie) => [cookie.split("=")[0], cookie])
  )

  for (const raw of incoming) {
    const pair = raw.split(";")[0]

    cookies.set(pair.split("=")[0], pair)
  }

  return Array.from(cookies.values()).join("; ")
}

async function main() {
  assert(baseUrl, "Set DELIVERY_PREVIEW_URL to the Vercel preview URL.")
  assert(password, "Set DELIVERY_QA_PASSWORD. The script does not store it.")

  let cookie = ""
  const loginPage = await fetch(`${baseUrl}/login`, { redirect: "manual" })

  cookie = mergeCookies(cookie, loginPage.headers)
  assert(loginPage.status === 200, `/login returned ${loginPage.status}`)

  const html = await loginPage.text()
  const inputs = Array.from(html.matchAll(/<input[^>]+>/g), (match) => match[0])
  const form = new FormData()

  for (const input of inputs) {
    const name = input.match(/name="([^"]*)"/)?.[1]
    const value = input.match(/value="([^"]*)"/)?.[1] ?? ""

    if (name) {
      form.append(decodeEntities(name), decodeEntities(value))
    }
  }

  form.set("email", email)
  form.set("password", password)

  const login = await fetch(`${baseUrl}/login`, {
    method: "POST",
    redirect: "manual",
    headers: cookie ? { cookie } : {},
    body: form,
  })

  cookie = mergeCookies(cookie, login.headers)
  assert(login.status === 303, `login returned ${login.status}`)
  assert(/sb-|supabase|auth-token/i.test(cookie), "login did not set an auth cookie")

  const build = await fetch(`${baseUrl}/debug/build`, {
    headers: { cookie },
    redirect: "manual",
  })
  const buildHtml = await build.text()

  assert(build.status === 200, `/debug/build returned ${build.status}`)
  assert(buildHtml.includes("Build Debug"), "build debug page did not render")
  assert(
    buildHtml.includes(expectedBranch),
    `build debug page does not show expected branch ${expectedBranch}`
  )
  assert(buildHtml.includes("Supabase ref"), "build debug page missing Supabase ref")

  const driver = await fetch(`${baseUrl}/delivery/driver`, {
    headers: { cookie },
    redirect: "manual",
  })
  const driverHtml = await driver.text()
  const v1Tabs = ["Available", "My Deliveries", "Completed", "Failed", "Expenses"]
  const legacyTabs = ["Dashboard", "Orders", "New Order", "Driver", "Vehicles"]

  assert(driver.status === 200, `/delivery/driver returned ${driver.status}`)
  assert(
    v1Tabs.every((tab) => driverHtml.includes(tab)),
    "/delivery/driver is missing V1 tabs"
  )
  assert(
    !legacyTabs.every((tab) => driverHtml.includes(tab)),
    "/delivery/driver still renders legacy tabs"
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        url: baseUrl,
        email,
        expectedBranch,
        loginRedirect: login.headers.get("location"),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
