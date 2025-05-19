"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export function MatchmakingFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [sportType, setSportType] = useState(searchParams.get("sportType") || "")
  const [skillLevel, setSkillLevel] = useState(searchParams.get("skillLevel") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "open")
  
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (sportType) {
      params.set("sportType", sportType)
    } else {
      params.delete("sportType")
    }
    
    if (skillLevel) {
      params.set("skillLevel", skillLevel)
    } else {
      params.delete("skillLevel")
    }
    
    if (status) {
      params.set("status", status)
    } else {
      params.delete("status")
    }
    
    router.push(`/matchmaking?${params.toString()}`)
  }
  
  const resetFilters = () => {
    setSportType("")
    setSkillLevel("")
    setStatus("open")
    
    const params = new URLSearchParams()
    const query = searchParams.get("query")
    if (query) params.set("query", query)
    
    router.push(`/matchmaking?${params.toString()}`)
  }
  
  // Apply filters on mount and when dependencies change
  useEffect(() => {
    const currentSportType = searchParams.get("sportType")
    const currentSkillLevel = searchParams.get("skillLevel")
    const currentStatus = searchParams.get("status")
    
    if (
      currentSportType !== sportType ||
      currentSkillLevel !== skillLevel ||
      currentStatus !== status
    ) {
      applyFilters()
    }
  }, [sportType, skillLevel, status])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="sport-type">Sport Type</Label>
          <Select value={sportType} onValueChange={setSportType}>
            <SelectTrigger id="sport-type">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="tennis">Tennis</SelectItem>
              <SelectItem value="soccer">Soccer</SelectItem>
              <SelectItem value="basketball">Basketball</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="skill-level">Skill Level</Label>
          <Select value={skillLevel} onValueChange={setSkillLevel}>
            <SelectTrigger id="skill-level">
              <SelectValue placeholder="Any Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Level</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Session Status</Label>
          <RadioGroup value={status} onValueChange={setStatus}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="open" id="status-open" />
              <Label htmlFor="status-open" className="cursor-pointer">Open</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in_progress" id="status-in-progress" />
              <Label htmlFor="status-in-progress" className="cursor-pointer">In Progress</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="status-all" />
              <Label htmlFor="status-all" className="cursor-pointer">All Statuses</Label>
            </div>
          </RadioGroup>
        </div>
        
        <Button variant="outline" onClick={resetFilters} className="w-full">
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )
}
