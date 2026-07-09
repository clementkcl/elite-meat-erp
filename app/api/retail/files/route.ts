import { NextResponse, type NextRequest } from "next/server"

import { getCurrentProfile } from "@/lib/auth/session"
import { asRecord, readString } from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const storagePath = request.nextUrl.searchParams.get("path")?.trim()

  if (!storagePath || !storagePath.startsWith("retail/")) {
    return NextResponse.json({ error: "Retail file path required." }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Storage is unavailable." }, { status: 503 })
  }

  const { data: file, error: fileError } = await supabase
    .from("retail_files")
    .select("bucket, storage_path")
    .eq("storage_path", storagePath)
    .maybeSingle()

  if (fileError) {
    return NextResponse.json({ error: fileError.message }, { status: 403 })
  }

  const fileRecord = asRecord(file)
  const bucket = readString(fileRecord.bucket, "erp-files")
  const path = readString(fileRecord.storage_path)

  if (!path) {
    return NextResponse.json({ error: "File not found." }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "File is not available." },
      { status: 403 }
    )
  }

  return NextResponse.redirect(data.signedUrl)
}
