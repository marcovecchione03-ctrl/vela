"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { submitOnboardingStep } from "@/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { BRANDING_PRESETS } from "@/modules/tenant/presets"
import { useFormStatus } from "react-dom"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { PLANS, type PlanName, type BillingInterval } from "@/lib/billing/plans"

function SubmitButton({ step, isBackDisabled, onBack }: { step: number, isBackDisabled: boolean, onBack: () => void }) {
  const { pending } = useFormStatus()
  return (
    <CardFooter className="flex justify-between">
      <Button 
        type="button"
        variant="outline" 
        disabled={isBackDisabled || pending} 
        onClick={onBack}
      >
        Back
      </Button>
      <Button type="submit" form="onboarding-form" disabled={pending}>
        {pending ? "Saving..." : step === 10 ? "Finish & Setup" : "Continue"}
      </Button>
    </CardFooter>
  )
}

export default function OnboardingWizard({ initialState }: { initialState: Record<string, any> }) {
  const router = useRouter()
  const [step, setStep] = useState(initialState.step || 1)
  const [error, setError] = useState<string | null>(null)

  // Determine initial theme selection
  const initialTheme = useMemo(() => {
    const t = initialState.tenant
    if (!t || !t.primaryColor) return "Essential" // Fresh default
    
    // Check if it exactly matches a preset
    for (const [key, preset] of Object.entries(BRANDING_PRESETS)) {
      if (
        t.primaryColor.toUpperCase() === preset.primaryColor.toUpperCase() &&
        t.secondaryColor.toUpperCase() === preset.secondaryColor.toUpperCase() &&
        t.bgColor.toUpperCase() === preset.bgColor.toUpperCase() &&
        t.textColor.toUpperCase() === preset.textColor.toUpperCase()
      ) {
        return key
      }
    }
    return "Custom" // Persisted custom styling
  }, [initialState.tenant])

  const [selectedTheme, setSelectedTheme] = useState<string>(initialTheme)
  const [clientTimezone, setClientTimezone] = useState<string>(
    initialState.tenant?.locations?.[0]?.timezone || ""
  )
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month")
  const [selectedPlan, setSelectedPlan] = useState<PlanName>("BASIC")

  useEffect(() => {
    if (!clientTimezone) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClientTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
      } catch (err) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClientTimezone("UTC") // safe generic fallback
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  async function handleAction(formData: FormData) {
    setError(null)
    
    const res = await submitOnboardingStep(step, formData)

    if (res.error) {
      setError(res.error)
      return
    }

    if (res.checkoutUrl) {
      // Redirect to Stripe checkout
      window.location.href = res.checkoutUrl
      return
    }

    if (res.step && res.step > 10) {
      // Completed (bypass mode)
      router.push(`/dashboard`)
      router.refresh()
    } else if (res.step) {
      setStep(res.step)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step {step} of 10</CardTitle>
        <CardDescription>
          {step === 1 && "What type of business do you manage?"}
          {step === 2 && "Business Identity"}
          {step === 3 && "Branding"}
          {step === 4 && "Business Contacts"}
          {step === 5 && "First Location"}
          {step === 6 && "Opening Hours"}
          {step === 7 && "Booking Rules"}
          {step === 8 && "Price Visibility"}
          {step === 9 && "Regional Settings"}
          {step === 10 && "Select your Plan"}
        </CardDescription>
      </CardHeader>
      
      <form id="onboarding-form" action={handleAction}>
        <CardContent className="space-y-4">
          
          {step === 1 && (
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select name="businessType" required defaultValue={initialState.tenant?.businessType || ""}>
                <option value="" disabled>Select a type...</option>
                <option value="Barber Shop">Barber Shop</option>
                <option value="Hair Salon">Hair Salon</option>
                <option value="Beauty Center">Beauty Center</option>
                <option value="Nail Salon">Nail Salon</option>
                <option value="SPA">SPA</option>
                <option value="Massage / Wellness">Massage / Wellness</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input name="name" required defaultValue={initialState.tenant?.name || ""} />
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input name="description" defaultValue={initialState.tenant?.description || ""} />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedTheme === "Custom" && (
                  <div 
                    className="border-2 border-primary rounded-md p-4 cursor-pointer relative"
                    onClick={() => setSelectedTheme("Custom")}
                  >
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <h4 className="font-bold">Custom Style</h4>
                    <p className="text-sm text-neutral-500 mb-4 h-10">Your existing advanced branding.</p>
                    <div 
                      className="h-24 w-full rounded-md border shadow-sm flex flex-col items-center justify-center relative overflow-hidden" 
                      style={{ backgroundColor: initialState.tenant?.bgColor || "#ffffff" }}
                    >
                      <div className="text-xs font-semibold mb-2" style={{ color: initialState.tenant?.textColor || "#000000" }}>
                        Book Appointment
                      </div>
                      <div className="flex gap-2">
                        <div className="px-3 py-1.5 text-xs rounded-md shadow-sm font-medium" style={{ backgroundColor: initialState.tenant?.primaryColor || "#000000", color: "#ffffff" }}>
                          Primary
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {Object.values(BRANDING_PRESETS).map((preset) => (
                  <div 
                    key={preset.name}
                    className={`border-2 rounded-md p-4 cursor-pointer transition-all relative ${selectedTheme === preset.name ? "border-primary" : "border-transparent bg-neutral-50 hover:bg-neutral-100"}`}
                    onClick={() => setSelectedTheme(preset.name)}
                    tabIndex={0}
                    role="radio"
                    aria-checked={selectedTheme === preset.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedTheme(preset.name)
                      }
                    }}
                  >
                    {selectedTheme === preset.name && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                    <h4 className="font-bold">{preset.name}</h4>
                    <p className="text-sm text-neutral-500 mb-4 h-10">{preset.description}</p>
                    
                    <div 
                      className="h-24 w-full rounded-md border shadow-sm flex flex-col items-center justify-center relative overflow-hidden" 
                      style={{ backgroundColor: preset.bgColor }}
                    >
                      <div className="text-xs font-semibold mb-2" style={{ color: preset.textColor }}>
                        Book Appointment
                      </div>
                      <div className="flex gap-2">
                        <div className="px-3 py-1.5 text-xs rounded-md shadow-sm font-medium" style={{ backgroundColor: preset.primaryColor, color: preset.bgColor }}>
                          Primary
                        </div>
                        <div className="px-3 py-1.5 text-xs rounded-md shadow-sm font-medium" style={{ backgroundColor: preset.secondaryColor, color: preset.bgColor }}>
                          Secondary
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hidden inputs to submit the actual colors to the server action */}
              <input type="hidden" name="primaryColor" value={selectedTheme === "Custom" ? initialState.tenant?.primaryColor : BRANDING_PRESETS[selectedTheme]?.primaryColor} />
              <input type="hidden" name="secondaryColor" value={selectedTheme === "Custom" ? initialState.tenant?.secondaryColor : BRANDING_PRESETS[selectedTheme]?.secondaryColor} />
              <input type="hidden" name="bgColor" value={selectedTheme === "Custom" ? initialState.tenant?.bgColor : BRANDING_PRESETS[selectedTheme]?.bgColor} />
              <input type="hidden" name="textColor" value={selectedTheme === "Custom" ? initialState.tenant?.textColor : BRANDING_PRESETS[selectedTheme]?.textColor} />
            </div>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Business Email</Label>
                <Input name="businessEmail" type="email" defaultValue={initialState.tenant?.businessEmail || ""} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="businessPhone" type="tel" defaultValue={initialState.tenant?.businessPhone || ""} />
              </div>
              <div className="space-y-2">
                <Label>Website (Optional)</Label>
                <Input name="websiteUrl" type="text" placeholder="example.com" defaultValue={initialState.tenant?.websiteUrl || ""} />
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input name="locationName" required defaultValue={initialState.tenant?.locations?.[0]?.name || "Main Shop"} />
              </div>
              <div className="space-y-2">
                <Label>Street Address</Label>
                <AddressAutocomplete name="address" required defaultValue={initialState.tenant?.locations?.[0]?.address || ""} />
              </div>
            </>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">Set your standard opening hours.</p>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
                    <Checkbox id={`open-${i}`} name={`open-${i}`} value="true" defaultChecked={i > 0 && i < 6} />
                    <Label htmlFor={`open-${i}`}>{day}</Label>
                  </div>
                  <Input type="time" name={`start-${i}`} defaultValue="09:00" className="w-32" />
                  <span>to</span>
                  <Input type="time" name={`end-${i}`} defaultValue="17:00" className="w-32" />
                </div>
              ))}
            </div>
          )}

          {step === 7 && (
            <>
              <div className="space-y-2">
                <Label>Booking Approval Mode</Label>
                <Select name="bookingApprovalMode" defaultValue={initialState.tenant?.bookingApprovalMode || "AUTOMATIC"}>
                  <option value="AUTOMATIC">Automatically confirm</option>
                  <option value="MANUAL">Require approval</option>
                </Select>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Cancellation Deadline (Hours before)</Label>
                <Input type="number" name="cancellationDeadlineHours" defaultValue={initialState.tenant?.cancellationDeadlineHours ?? 24} />
              </div>
            </>
          )}

          {step === 8 && (
            <div className="flex items-center space-x-2">
              <Checkbox id="showPrices" name="showPrices" value="on" defaultChecked />
              <Label htmlFor="showPrices">Show service prices to customers</Label>
            </div>
          )}

          {step === 9 && (
            <>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select name="defaultLocale" defaultValue="it-IT">
                  <option value="it-IT">Italiano</option>
                  <option value="en-US">English</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select name="currency" defaultValue="EUR">
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US Dollar ($)</option>
                </Select>
              </div>
            </>
          )}

          {step === 10 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="inline-flex rounded-md p-1 bg-neutral-100 border">
                  <label className={`cursor-pointer px-4 py-2 rounded text-sm font-medium transition-colors ${billingInterval === "month" ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black"}`}>
                    <input type="radio" name="interval" value="month" className="sr-only" checked={billingInterval === "month"} onChange={() => setBillingInterval("month")} />
                    Monthly billing
                  </label>
                  <label className={`cursor-pointer px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${billingInterval === "year" ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-black"}`}>
                    <input type="radio" name="interval" value="year" className="sr-only" checked={billingInterval === "year"} onChange={() => setBillingInterval("year")} />
                    Annual billing
                    <span className="text-[10px] uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Save ~20%</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["BASIC", "PRO"] as PlanName[]).map((planName) => {
                  const plan = PLANS[planName];
                  const isSelected = selectedPlan === planName;
                  
                  const monthlyPrice = plan.monthlyAmountCents / 100;
                  const annualPrice = plan.annualAmountCents / 100;
                  const equivalentMonthly = plan.annualAmountCents / 100 / 12;
                  
                  const yearlyCostIfMonthly = plan.monthlyAmountCents * 12 / 100;
                  const annualSaving = (plan.monthlyAmountCents * 12 - plan.annualAmountCents) / 100;

                  return (
                    <label
                      key={planName}
                      className={`relative flex flex-col border rounded-xl p-6 cursor-pointer transition-all ${isSelected ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/50" : "border-neutral-200 hover:border-blue-300"}`}
                    >
                      <input type="radio" name="plan" value={planName} className="sr-only" checked={isSelected} onChange={() => setSelectedPlan(planName)} />
                      
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-lg">{plan.name}</h4>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-600 bg-blue-600" : "border-neutral-300"}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>

                      <p className="text-sm text-neutral-500 mb-4">{plan.locationLimit} location{plan.locationLimit > 1 ? "s" : ""}</p>

                      {billingInterval === "month" ? (
                        <div className="mt-auto">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">€{monthlyPrice.toFixed(2)}</span>
                            <span className="text-neutral-500">/ month</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex flex-col gap-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">€{annualPrice.toFixed(2)}</span>
                            <span className="text-neutral-500">/ year</span>
                          </div>
                          
                          <div className="text-sm font-medium text-neutral-600">
                            Equivalent to €{equivalentMonthly.toFixed(2)}/month
                          </div>
                          
                          <div className="mt-2 inline-block w-fit bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                            Save €{annualSaving.toFixed(2)}/year
                          </div>
                          
                          <div className="text-xs text-neutral-400 mt-1 line-through">
                            €{yearlyCostIfMonthly.toFixed(2)} if paid monthly
                          </div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
              
              <div className="text-center text-sm text-neutral-500 mt-4">
                {selectedPlan} &middot; {billingInterval === "month" ? "Monthly" : "Annual"} <br/>
                €{billingInterval === "month" ? (PLANS[selectedPlan].monthlyAmountCents / 100).toFixed(2) : (PLANS[selectedPlan].annualAmountCents / 100).toFixed(2)} billed {billingInterval === "month" ? "monthly" : "yearly"}
              </div>
            </div>
          )}

          {clientTimezone && <input type="hidden" name="timezone" value={clientTimezone} />}
          {error && <div className="text-sm text-red-500">{error}</div>}
        </CardContent>
        <SubmitButton step={step} isBackDisabled={step === 1} onBack={() => setStep(step - 1)} />
      </form>
    </Card>
  )
}
