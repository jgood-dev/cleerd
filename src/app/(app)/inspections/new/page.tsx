import { redirect } from 'next/navigation'

export default function NewInspectionPage() {
  redirect("/schedule?new=1")
}
