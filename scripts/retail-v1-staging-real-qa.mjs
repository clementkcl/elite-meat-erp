import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const root = process.cwd()
const qaPassword = process.env.RETAIL_QA_PASSWORD || "RetailQA2026!"
const outletA = "20000000-0000-4000-8000-000000000001"
const outletB = "20000000-0000-4000-8000-000000000002"
let workerAId = ""
let managerAId = ""
let managerBId = ""
let adminId = ""
let directorId = ""

function readEnv() {
  const envPath = path.join(root, ".env.local")
  const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : []
  const env = { ...process.env }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue
    }

    const [key, ...rest] = trimmed.split("=")
    env[key] = rest.join("=").replace(/^"|"$/g, "")
  }

  return env
}

const env = readEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

function client() {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function signIn(email) {
  const supabase = client()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: qaPassword,
  })

  if (error) {
    throw new Error(`${email} sign-in failed: ${error.message}`)
  }

  return { supabase, userId: data.user?.id ?? "" }
}

async function expectOk(label, promise) {
  const { data, error } = await promise

  if (error) {
    throw new Error(`${label}: expected success, got ${error.message}`)
  }

  return data
}

async function expectBlocked(label, promise) {
  const { data, error } = await promise

  if (error) {
    return { blockedBy: error.message }
  }

  const rows = Array.isArray(data) ? data : data ? [data] : []

  if (rows.length === 0) {
    return { blockedBy: "no rows visible" }
  }

  throw new Error(`${label}: expected blocked or empty result, got ${rows.length} row(s).`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function yesterday() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function approx(actual, expected, message) {
  assert(Math.abs(Number(actual) - expected) < 0.001, `${message}: expected ${expected}, got ${actual}.`)
}

function sourceContains(relativePath, fragment) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").includes(fragment)
}

const results = []
const blockers = []

function pass(name, detail = "") {
  results.push({ status: "PASS", name, detail })
}

function fail(name, detail) {
  results.push({ status: "BLOCKER", name, detail })
  blockers.push(`${name}: ${detail}`)
}

async function main() {
  const qaDate = today()
  const pastDate = yesterday()
  const runId = Date.now().toString()

  const workerA = await signIn("retail.worker.outletA@example.test")
  const managerA = await signIn("retail.manager.outletA@example.test")
  const workerB = await signIn("retail.worker.outletB@example.test")
  const managerB = await signIn("retail.manager.outletB@example.test")
  const admin = await signIn("admin.qa@example.test")
  const director = await signIn("director.qa@example.test")

  workerAId = workerA.userId
  managerAId = managerA.userId
  managerBId = managerB.userId
  adminId = admin.userId
  directorId = director.userId

  pass("QA users sign in", "All six real Supabase Auth users signed in.")

  const existingWorkerSale = await expectOk(
    "worker A existing daily sales",
    workerA.supabase
      .from("retail_daily_sales")
      .select("id,status")
      .eq("outlet_id", outletA)
      .eq("sales_date", qaDate)
      .maybeSingle()
  )
  const workerDraftSale =
    existingWorkerSale ??
    (await expectOk(
      "worker A daily sales draft",
      workerA.supabase.from("retail_daily_sales").insert({
        outlet_id: outletA,
        sales_date: qaDate,
        payment_code: "SUMMARY",
        gross_sales: 1,
        discount_amount: 0,
        cash_received: 1,
        cash_sales: 1,
        bank_transfer_sales: 0,
        ewallet_sales: 0,
        credit_sales: 0,
        total_sales: 1,
        status: "DRAFT",
        created_by: workerAId,
        updated_by: workerAId,
      }).select("id,status").single()
    ))
  pass(
    "Worker daily sales draft",
    existingWorkerSale
      ? "Outlet A already has today's Daily Sales; draft insert evidence was skipped for rerun safety."
      : "Retail worker saved Outlet A Daily Sales as DRAFT."
  )

  if (workerDraftSale.status === "DRAFT") {
    await expectBlocked(
      "worker A cannot confirm daily sales",
      workerA.supabase
        .from("retail_daily_sales")
        .update({ status: "CONFIRMED", updated_by: workerAId })
        .eq("id", workerDraftSale.id)
        .select("id,status")
    )
    pass("Worker daily sales confirm block", "Retail worker cannot confirm Daily Sales.")
  } else {
    pass(
      "Worker daily sales confirm block",
      "Outlet A Daily Sales was already confirmed before this run; worker confirmation block was skipped for rerun safety."
    )
  }

  const saleA = await expectOk(
    "manager A daily sales",
    managerA.supabase.from("retail_daily_sales").upsert({
      outlet_id: outletA,
      sales_date: qaDate,
      payment_code: "SUMMARY",
      gross_sales: 450,
      discount_amount: 0,
      cash_received: 125,
      cash_sales: 125,
      bank_transfer_sales: 200,
      ewallet_sales: 75,
      credit_sales: 50,
      total_sales: 450,
      status: "CONFIRMED",
      autocount_attachment_url: null,
      remarks: `QA missing attachment ${runId}`,
      created_by: managerAId,
      updated_by: managerAId,
    }, { onConflict: "outlet_id,sales_date" }).select("id,total_sales,cash_sales,bank_transfer_sales,ewallet_sales,credit_sales,autocount_attachment_url,status").single()
  )
  approx(saleA.total_sales, 450, "Daily sales total")
  assert(saleA.status === "CONFIRMED", "Manager Daily Sales must be confirmed.")
  pass("Manager daily sales", "Manager A confirmed Outlet A daily sales; missing attachment allowed.")

  await expectOk(
    "manager B daily sales",
    managerB.supabase.from("retail_daily_sales").upsert({
      outlet_id: outletB,
      sales_date: qaDate,
      payment_code: "SUMMARY",
      gross_sales: 300,
      discount_amount: 0,
      cash_received: 100,
      cash_sales: 100,
      bank_transfer_sales: 100,
      ewallet_sales: 50,
      credit_sales: 50,
      total_sales: 300,
      status: "CONFIRMED",
      autocount_attachment_url: `retail/autocount/outlet-b-${runId}.pdf`,
      remarks: `QA attachment ${runId}`,
      created_by: managerBId,
      updated_by: managerBId,
    }, { onConflict: "outlet_id,sales_date" }).select("id").single()
  )

  const workerAVisibleSales = await expectOk(
    "worker A visible sales",
    workerA.supabase.from("retail_daily_sales").select("outlet_id,sales_date,total_sales")
  )
  assert(workerAVisibleSales.every((row) => row.outlet_id === outletA), "Worker A can see non-Outlet A sales.")
  pass("Worker A outlet isolation", `Worker A visible sales rows: ${workerAVisibleSales.length}.`)

  const workerBVisibleSales = await expectOk(
    "worker B visible sales",
    workerB.supabase.from("retail_daily_sales").select("outlet_id,sales_date,total_sales")
  )
  assert(workerBVisibleSales.every((row) => row.outlet_id === outletB), "Worker B can see non-Outlet B sales.")
  pass("Worker B outlet isolation", `Worker B visible sales rows: ${workerBVisibleSales.length}.`)

  await expectBlocked(
    "manager A direct read Outlet B",
    managerA.supabase.from("retail_daily_sales").select("id,outlet_id").eq("outlet_id", outletB)
  )
  pass("Manager cross-outlet read block", "Manager A cannot read Outlet B sales by direct API filter.")

  const adminSales = await expectOk(
    "admin all outlet sales",
    admin.supabase.from("retail_daily_sales").select("outlet_id,total_sales").in("outlet_id", [outletA, outletB])
  )
  assert(new Set(adminSales.map((row) => row.outlet_id)).size >= 2, "Admin cannot see both outlets.")
  pass("Admin all-outlet visibility", "Admin sees Outlet A and Outlet B daily sales.")

  const directorSales = await expectOk(
    "director all outlet sales",
    director.supabase.from("retail_daily_sales").select("outlet_id,total_sales").in("outlet_id", [outletA, outletB])
  )
  assert(new Set(directorSales.map((row) => row.outlet_id)).size >= 2, "Director cannot see both outlets.")
  pass("Director all-outlet visibility", "Director sees Outlet A and Outlet B daily sales.")

  const expenseA = await expectOk(
    "worker A expense",
    workerA.supabase.from("retail_expenses").insert({
      outlet_id: outletA,
      expense_date: qaDate,
      category: "Retail QA Supplies",
      category_id: "23000000-0000-4000-8000-000000000001",
      amount: 45,
      payment_method: "CASH",
      status: "SUBMITTED",
      receipt_url: `retail/expenses/outlet-a-${runId}.txt`,
      submitted_by: workerAId,
      submitted_at: new Date().toISOString(),
      remarks: `QA cash expense ${runId}`,
    }).select("id,amount,payment_method,status,submitted_by").single()
  )
  pass("Worker expense with receipt", `Expense ${expenseA.id} submitted.`)

  await expectBlocked(
    "worker A expense without receipt",
    workerA.supabase.from("retail_expenses").insert({
      outlet_id: outletA,
      expense_date: qaDate,
      category: "Retail QA Supplies",
      amount: 5,
      payment_method: "CASH",
      status: "SUBMITTED",
      receipt_url: "",
      submitted_by: workerAId,
      submitted_at: new Date().toISOString(),
    }).select("id")
  )
  pass("Expense receipt required", "Missing receipt upload is rejected.")

  await expectOk(
    "manager A review expense",
    managerA.supabase.from("retail_expenses").update({
      status: "REVIEWED",
      reviewed_by: managerAId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", expenseA.id).select("id,status").single()
  )
  pass("Manager expense review", "Manager A reviewed Worker A expense.")

  await expectBlocked(
    "manager B update Outlet A expense",
    managerB.supabase.from("retail_expenses").update({ remarks: "cross outlet should fail" }).eq("id", expenseA.id).select("id")
  )
  pass("Manager cross-outlet edit block", "Manager B cannot update Outlet A expense.")

  const cleaningTask = await expectOk(
    "manager A cleaning task",
    managerA.supabase.from("retail_cleaning_tasks").upsert({
      outlet_id: outletA,
      department_id: "21000000-0000-4000-8000-000000000001",
      task_name: "Retail QA Daily Cleaning",
      frequency: "DAILY",
      due_date: qaDate,
      status: "PENDING",
      is_active: true,
      active: true,
      created_by: managerAId,
      updated_by: managerAId,
    }, { onConflict: "outlet_id,task_name,frequency" }).select("id,status").single()
  )

  await expectOk(
    "worker A complete cleaning task",
    workerA.supabase.from("retail_cleaning_tasks").update({
      status: "DONE",
      completed_by: workerAId,
      completed_at: new Date().toISOString(),
      completion_photo_url: `retail/cleaning/outlet-a-${runId}.jpg`,
      updated_by: workerAId,
    }).eq("id", cleaningTask.id).select("id,status").single()
  )

  await expectOk(
    "worker A cleaning completion history",
    workerA.supabase.from("retail_cleaning_completions").upsert({
      task_id: cleaningTask.id,
      outlet_id: outletA,
      completion_date: qaDate,
      completed_by: workerAId,
      completed_at: new Date().toISOString(),
      photo_url: `retail/cleaning/outlet-a-${runId}.jpg`,
      remarks: "QA cleaning complete",
    }, { onConflict: "task_id,completion_date" }).select("id").single()
  )
  pass("Cleaning workflow", "Manager created task; worker completed it with completion history.")

  const processing = await expectOk(
    "worker A processing batch",
    workerA.supabase.from("retail_processing_batches").insert({
      batch_no: `QA-RP-${runId}`,
      outlet_id: outletA,
      department_id: "21000000-0000-4000-8000-000000000001",
      stock_location_id: "22000000-0000-4000-8000-000000000001",
      processing_date: qaDate,
      processing_type: "Retail QA BOM",
      raw_quantity: 2,
      raw_weight_kg: 100,
      finished_quantity: 2,
      finished_weight_kg: 85,
      wastage_weight_kg: 8,
      wastage_reason: "QA trim",
      wastage_photo_url: `retail/processing/wastage-${runId}.jpg`,
      warning_message: "Unaccounted difference above 2%",
      status: "SUBMITTED",
      processed_by: workerAId,
      worker_id: workerAId,
      created_by: workerAId,
      submitted_by: workerAId,
      submitted_at: new Date().toISOString(),
      remarks: "QA processing",
    }).select("id,raw_weight_kg,finished_weight_kg,wastage_weight_kg,yield_percent,wastage_percent,unaccounted_difference_kg").single()
  )
  approx(processing.yield_percent, 85, "Processing yield percent")
  approx(processing.wastage_percent, 8, "Processing wastage percent")
  approx(processing.unaccounted_difference_kg, 7, "Processing unaccounted difference")

  await expectOk(
    "worker A raw lines",
    workerA.supabase.from("retail_processing_raw_lines").insert([
      { processing_batch_id: processing.id, item_name: "QA Raw Pork Shoulder", raw_item_name: "QA Raw Pork Shoulder", weight_kg: 60, weight: 60, quantity: 1 },
      { processing_batch_id: processing.id, item_name: "QA Raw Pork Fat", raw_item_name: "QA Raw Pork Fat", weight_kg: 40, weight: 40, quantity: 1 },
    ]).select("id")
  )

  await expectOk(
    "worker A finished lines",
    workerA.supabase.from("retail_processing_finished_lines").insert([
      { processing_batch_id: processing.id, item_name: "QA Minced Pork", finished_item_name: "QA Minced Pork", weight_kg: 82, weight: 82, quantity: 1 },
      { processing_batch_id: processing.id, item_name: "QA Sausage", finished_item_name: "QA Sausage", weight_kg: 3, weight: 3, quantity: 1 },
    ]).select("id")
  )
  pass("Processing workflow", "Worker created submitted processing record with multiple raw and finished lines.")

  await expectOk(
    "manager A read processing",
    managerA.supabase
      .from("retail_processing_batches")
      .select("id,status,yield_percent,wastage_percent,unaccounted_difference_kg")
      .eq("id", processing.id)
      .single()
  )
  pass("Manager processing report", "Manager A viewed Worker A processing record as report-only evidence.")

  await expectBlocked(
    "worker A cash closing",
    workerA.supabase.from("retail_daily_closings").insert({
      outlet_id: outletA,
      closing_date: qaDate,
      opening_cash: 300,
      cash_sales: 125,
      cash_expenses: 45,
      expected_cash: 380,
      actual_cash_counted: 390,
      closing_cash: 390,
      variance_amount: 10,
      status: "SUBMITTED",
      submitted_by: workerAId,
      submitted_at: new Date().toISOString(),
    }).select("id")
  )
  pass("Worker cash closing block", "Worker A cannot submit cash closing.")

  const closing = await expectOk(
    "manager A cash closing",
    managerA.supabase.from("retail_daily_closings").upsert({
      outlet_id: outletA,
      closing_date: qaDate,
      opening_cash: 300,
      cash_sales: 125,
      bank_transfer_sales: 200,
      ewallet_sales: 75,
      credit_sales: 50,
      cash_expenses: 45,
      expected_cash: 380,
      actual_cash_counted: 390,
      total_sales: 450,
      cash_received: 125,
      expenses_amount: 45,
      closing_cash: 390,
      variance_amount: 10,
      status: "SUBMITTED",
      submitted_by: managerAId,
      submitted_at: new Date().toISOString(),
      remarks: `QA closing ${runId}`,
    }, { onConflict: "outlet_id,closing_date" }).select("id,expected_cash,variance_amount").single()
  )
  approx(closing.expected_cash, 380, "Cash closing expected cash")
  approx(closing.variance_amount, 10, "Cash closing variance")

  await expectOk(
    "manager A same-day closing edit",
    managerA.supabase.from("retail_daily_closings").update({
      remarks: `QA same-day edit ${runId}`,
      updated_by: managerAId,
    }).eq("id", closing.id).select("id").single()
  )

  const closingAudit = await expectOk(
    "manager A closing audit",
    managerA.supabase.from("retail_audit_logs").select("id,table_name,record_id,field_name").eq("record_id", closing.id)
  )
  assert(closingAudit.length > 0, "Same-day cash closing edit did not create audit rows.")
  pass("Cash closing same-day audit", `Audit rows created: ${closingAudit.length}.`)

  const pastClosing = await expectOk(
    "admin past closing",
    admin.supabase.from("retail_daily_closings").upsert({
      outlet_id: outletA,
      closing_date: pastDate,
      opening_cash: 100,
      cash_sales: 100,
      bank_transfer_sales: 0,
      ewallet_sales: 0,
      credit_sales: 0,
      cash_expenses: 0,
      expected_cash: 200,
      actual_cash_counted: 200,
      total_sales: 100,
      cash_received: 100,
      expenses_amount: 0,
      closing_cash: 200,
      variance_amount: 0,
      status: "SUBMITTED",
      submitted_by: adminId,
      submitted_at: new Date().toISOString(),
      remarks: `QA past closing ${runId}`,
    }, { onConflict: "outlet_id,closing_date" }).select("id").single()
  )

  await expectOk(
    "director edit past closing",
    director.supabase.from("retail_daily_closings").update({
      remarks: `QA director past edit ${runId}`,
      updated_by: directorId,
    }).eq("id", pastClosing.id).select("id").single()
  )

  const pastAudit = await expectOk(
    "director past closing audit",
    director.supabase.from("retail_audit_logs").select("id").eq("record_id", pastClosing.id)
  )
  assert(pastAudit.length > 0, "Past cash closing edit did not create audit rows.")
  pass("Admin/director past closing audit", `Audit rows created: ${pastAudit.length}.`)

  const adminProcessing = await expectOk(
    "admin processing report filters",
    admin.supabase.from("retail_processing_batches").select("id,outlet_id,processing_type,raw_weight_kg,finished_weight_kg,wastage_weight_kg").eq("outlet_id", outletA).ilike("processing_type", "%QA%")
  )
  assert(adminProcessing.length > 0, "Admin processing outlet/type filter returned no QA records.")
  pass("Admin report filters", "Admin can filter processing by outlet/type through API.")

  if (!sourceContains("components/retail/retail-forms.tsx", "type=\"file\"")) {
    fail("Retail file upload UI", "Retail forms do not expose actual file inputs.")
  }

  const uploadPath = `retail/${outletA}/expenses/${expenseA.id}/${runId}-receipt.txt`
  const uploadResult = await workerA.supabase.storage
    .from("erp-files")
    .upload(uploadPath, new Blob(["retail qa receipt"], { type: "text/plain" }), {
      contentType: "text/plain",
      upsert: false,
    })

  if (uploadResult.error) {
    fail("Retail storage upload", `Worker A upload failed: ${uploadResult.error.message}`)
  } else {
    await expectOk(
      "worker A retail file metadata",
      workerA.supabase.from("retail_files").insert({
        outlet_id: outletA,
        record_type: "expenses",
        record_id: expenseA.id,
        bucket: "erp-files",
        storage_path: uploadPath,
        original_filename: `${runId}-receipt.txt`,
        mime_type: "text/plain",
        uploaded_by: workerAId,
      }).select("id").single()
    )

    const downloadByWorkerA = await workerA.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (downloadByWorkerA.error) {
      fail("Retail storage same-outlet worker access", `Worker A cannot download own outlet file: ${downloadByWorkerA.error.message}`)
    } else {
      pass("Retail storage same-outlet worker access", "Worker A can download Outlet A Retail file.")
    }

    const downloadByManagerA = await managerA.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (downloadByManagerA.error) {
      fail("Retail storage same-outlet manager access", `Manager A cannot download Outlet A file: ${downloadByManagerA.error.message}`)
    } else {
      pass("Retail storage same-outlet manager access", "Manager A can download Outlet A Retail file.")
    }

    const downloadByWorkerB = await workerB.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (!downloadByWorkerB.error) {
      fail("Retail storage outlet isolation", "Worker B can download Worker A uploaded file from erp-files.")
    } else {
      pass("Retail storage outlet isolation", "Worker B cannot download Worker A uploaded file.")
    }

    const downloadByManagerB = await managerB.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (!downloadByManagerB.error) {
      fail("Retail storage manager outlet isolation", "Manager B can download Outlet A Retail file.")
    } else {
      pass("Retail storage manager outlet isolation", "Manager B cannot download Outlet A Retail file.")
    }

    const downloadByAdmin = await admin.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (downloadByAdmin.error) {
      fail("Retail storage admin access", `Admin cannot download Outlet A Retail file: ${downloadByAdmin.error.message}`)
    } else {
      pass("Retail storage admin access", "Admin can download Outlet A Retail file.")
    }

    const downloadByDirector = await director.supabase.storage
      .from("erp-files")
      .download(uploadPath)

    if (downloadByDirector.error) {
      fail("Retail storage director access", `Director cannot download Outlet A Retail file: ${downloadByDirector.error.message}`)
    } else {
      pass("Retail storage director access", "Director can download Outlet A Retail file.")
    }
  }

  const workerBCrossUpload = await workerB.supabase.storage
    .from("erp-files")
    .upload(
      `retail/${outletA}/expenses/${expenseA.id}/${runId}-worker-b-cross.txt`,
      new Blob(["cross outlet"], { type: "text/plain" }),
      { contentType: "text/plain", upsert: false }
    )

  if (!workerBCrossUpload.error) {
    fail("Retail storage cross-outlet upload block", "Worker B can upload into Outlet A Retail path.")
  } else {
    pass("Retail storage cross-outlet upload block", "Worker B cannot upload into Outlet A Retail path.")
  }

  const oldDirectPathUpload = await workerA.supabase.storage
    .from("erp-files")
    .upload(
      `retail/${outletA}/qa/${runId}-old-path.txt`,
      new Blob(["old direct path"], { type: "text/plain" }),
      { contentType: "text/plain", upsert: false }
    )

  if (!oldDirectPathUpload.error) {
    fail("Retail storage old direct path block", "Worker A can still upload using old non-record Retail path.")
  } else {
    pass("Retail storage old direct path block", "Old non-record Retail path uploads are blocked.")
  }

  if (!sourceContains("components/retail/retail-page.tsx", "Export")) {
    fail("Retail report export", "Retail Reports V1 has no export control implemented.")
  }

  if (!sourceContains("components/retail/retail-page.tsx", "grid gap-3 sm:grid-cols-2 xl:grid-cols-4")) {
    fail("Mobile report filters", "Retail report filter mobile layout marker was not found.")
  } else {
    pass("Mobile responsive source check", "Retail report filters use responsive grid layout.")
  }

  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.detail ? ` - ${result.detail}` : ""}`)
  }

  if (blockers.length > 0) {
    console.error(`Retail V1 staging QA blockers (${blockers.length}):`)
    for (const blocker of blockers) {
      console.error(`- ${blocker}`)
    }
    process.exit(1)
  }

  console.log("Retail V1 staging QA passed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
