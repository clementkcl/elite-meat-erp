export function assertDamageCanBeManagerReviewed(status: string) {
  if (status !== "SUBMITTED") {
    throw new Error("Only submitted damage requests can be manager reviewed.")
  }
}

export function damageRejectionSignatureLabel(status: string) {
  if (status === "SUBMITTED") {
    return "Manager damage rejection"
  }

  if (status === "MANAGER_REVIEWED") {
    return "Director damage rejection"
  }

  throw new Error("This damage request can no longer be rejected.")
}

export function assertReturnSupplierCanBeRejected(status: string) {
  if (status !== "SUBMITTED") {
    throw new Error("This return supplier request can no longer be rejected.")
  }
}
