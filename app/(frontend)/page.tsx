import HomePage from "@/components/HomePage"



export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Home | Grounded Gems",
  description: "Welcome to Grounded Gems, your go-to platform for all things events and community.",
}


export default function Home() {
  return (
   <div>
      <HomePage/>
   </div>
  )
}
