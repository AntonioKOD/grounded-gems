"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [time, setTime] = useState(value || "12:00")

  // Sync with external value
  useEffect(() => {
    if (value) {
      setTime(value)
    }
  }, [value])

  // Update when internal state changes
  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    onChange(newTime)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value)} className="w-full" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {["09:00", "12:00", "15:00", "18:00"].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => handleTimeChange(preset)}
                className={cn(time === preset && "bg-primary text-primary-foreground")}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
