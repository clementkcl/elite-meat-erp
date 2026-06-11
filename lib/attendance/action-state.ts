export type AttendanceActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialAttendanceActionState: AttendanceActionState = {
  status: "idle",
  message: "",
}
