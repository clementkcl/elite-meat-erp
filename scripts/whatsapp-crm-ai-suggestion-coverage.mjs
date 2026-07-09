import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/ai-suggest/route.ts")
const service = read("lib/whatsapp-crm/ai-suggestions.ts")
const data = read("lib/whatsapp-crm/data.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const mock = read("data/mock/whatsapp-crm.ts")
const packageJson = read("package.json")

assert(
  route.includes("getCurrentProfile") &&
    route.includes("generateWhatsappCrmAiSuggestion") &&
    route.includes('export const runtime = "nodejs"') &&
    route.includes("POST"),
  "AI suggestion route must authenticate staff and delegate in Node runtime."
)

for (const marker of [
  "aiSuggestionRoles",
  '"owner"',
  '"admin"',
  '"sales"',
  '"customer_service"',
  "This role cannot request AI suggested replies.",
  "You can only request AI suggestions for customers assigned to you.",
]) {
  assert(service.includes(marker), `AI suggestion permissions missing ${marker}.`)
}

for (const behavior of [
  "OPENAI_API_KEY",
  "OPENAI_CRM_AI_MODEL",
  "https://api.openai.com/v1/responses",
  "gpt-5.2",
  "text: {",
  "json_schema",
  "suggestionSchema",
  "outputTextFromOpenAiResponse",
  "fallbackSuggestionForContext",
]) {
  assert(service.includes(behavior), `AI suggestion generation missing ${behavior}.`)
}

for (const capability of [
  "detectProduct",
  "detectWeightQuantity",
  "detectFulfillment",
  "hasChineseText",
  "hasLikelyIbanText",
  "translations",
  "followUpRecommendation",
  "detectedOrderDetails",
]) {
  assert(service.includes(capability), `AI suggestion capability missing ${capability}.`)
}

for (const persistence of [
  '"crm_ai_suggestions"',
  "suggestion_text",
  "reason: JSON.stringify",
  "status: \"PENDING\"",
  "WHATSAPP_AI_SUGGEST_REPLY",
]) {
  assert(service.includes(persistence), `AI suggestion persistence missing ${persistence}.`)
}

for (const typeMarker of [
  "detectedOrderDetails?",
  "translations?",
  "followUpRecommendation?",
  'source?: "openai" | "fallback"',
]) {
  assert(types.includes(typeMarker), `CRM AI type missing ${typeMarker}.`)
}

assert(
  data.includes("parseAiSuggestionReason") &&
    data.includes("aiSuggestionFromRow") &&
    data.includes("detectedOrderDetails") &&
    data.includes("followUpRecommendation"),
  "Data loader must parse stored AI suggestion metadata."
)

for (const marker of [
  "AiSuggestionPanel",
  "Suggest Reply",
  'fetch("/api/whatsapp/ai-suggest"',
  "onAiSuggestionSaved",
  "setAiSuggestions",
  "detectedOrderDetails",
  "translations",
  "followUpRecommendation",
  "Use draft",
  "Edit first",
  "Staff approval required before sending.",
]) {
  assert(inbox.includes(marker), `AI suggestion UI missing ${marker}.`)
}

for (const fixture of [
  "detectedOrderDetails",
  "translations",
  "followUpRecommendation",
  'source: "fallback"',
]) {
  assert(mock.includes(fixture), `Demo AI suggestion data missing ${fixture}.`)
}

assert(
  packageJson.includes("whatsapp-crm-ai-suggestion-coverage.mjs"),
  "AI suggestion coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM AI suggestion coverage passed.")
