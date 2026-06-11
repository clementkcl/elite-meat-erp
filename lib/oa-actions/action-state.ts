export type OaActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialOaActionState: OaActionState = {
  status: "idle",
  message: "",
}
