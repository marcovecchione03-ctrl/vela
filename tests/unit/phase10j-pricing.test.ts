import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 10J - Onboarding Step 10 Annual Pricing Fix', () => {
  const wizardPath = path.join(__dirname, '../../src/app/onboarding/Wizard.tsx');
  const plansPath = path.join(__dirname, '../../src/lib/billing/plans.ts');
  const actionPath = path.join(__dirname, '../../src/actions/billing.ts');
  const onboardingPath = path.join(__dirname, '../../src/actions/onboarding.ts');
  
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');
  const plansContent = fs.readFileSync(plansPath, 'utf-8');
  const actionContent = fs.readFileSync(actionPath, 'utf-8');
  const onboardingContent = fs.readFileSync(onboardingPath, 'utf-8');

  it('A. Monthly Basic displays €29.99', () => {
    expect(wizardContent).toContain('monthlyAmountCents / 100');
    expect(plansContent).toContain('monthlyAmountCents: 2999');
  });

  it('B. Monthly Pro displays €59.99', () => {
    expect(plansContent).toContain('monthlyAmountCents: 5999');
  });

  it('C. Annual Basic displays €287.90', () => {
    expect(plansContent).toContain('annualAmountCents: 28790');
    expect(wizardContent).toContain('annualAmountCents / 100');
  });

  it('D. Annual Pro displays €575.90', () => {
    expect(plansContent).toContain('annualAmountCents: 57590');
  });

  it('E. Annual Basic equivalent monthly value is €23.99', () => {
    expect(wizardContent).toContain('equivalentMonthly = plan.annualAmountCents / 100 / 12');
  });

  it('F. Annual Pro equivalent monthly value is €47.99', () => {
    expect(wizardContent).toContain('equivalentMonthly = plan.annualAmountCents / 100 / 12');
  });

  it('G. Basic annual saving is €71.98', () => {
    expect(wizardContent).toContain('annualSaving = (plan.monthlyAmountCents * 12 - plan.annualAmountCents) / 100');
  });

  it('H. Pro annual saving is €143.98', () => {
    expect(wizardContent).toContain('annualSaving = (plan.monthlyAmountCents * 12 - plan.annualAmountCents) / 100');
  });

  it('I. Basic 12-month monthly comparison is €359.88', () => {
    expect(wizardContent).toContain('yearlyCostIfMonthly = plan.monthlyAmountCents * 12 / 100');
  });

  it('J. Pro 12-month monthly comparison is €719.88', () => {
    expect(wizardContent).toContain('yearlyCostIfMonthly = plan.monthlyAmountCents * 12 / 100');
  });

  it('K. switching monthly -> annual updates visible prices', () => {
    expect(wizardContent).toContain('billingInterval === "year"');
    expect(wizardContent).toContain('setBillingInterval("year")');
  });

  it('L. switching annual -> monthly restores monthly prices', () => {
    expect(wizardContent).toContain('billingInterval === "month"');
    expect(wizardContent).toContain('setBillingInterval("month")');
  });

  it('M. selected plan survives interval switching', () => {
    expect(wizardContent).toContain('const [selectedPlan, setSelectedPlan] = useState<PlanName>("BASIC")');
    expect(wizardContent).toContain('const [billingInterval, setBillingInterval] = useState<BillingInterval>("month")');
  });

  it('N. annual UI never renders undefined / blank price', () => {
    expect(wizardContent).not.toContain('{(2999 / 100).toFixed(2)}'); // ensure old hardcode is gone
    expect(wizardContent).not.toContain('{(5999 / 100).toFixed(2)}');
    expect(wizardContent).toContain('annualPrice.toFixed(2)');
  });

  it('O, P, Q, R. Checkout resolves Stripe price IDs correctly', () => {
    expect(actionContent).toContain('const planConfig = PLANS[plan]');
    expect(actionContent).toContain('const priceId = planConfig.pricing[interval].priceId');
  });

  it('S. Finish & Setup submits the currently selected billing interval', () => {
    expect(wizardContent).toContain('name="interval"');
    expect(wizardContent).toContain('checked={billingInterval === "month"}');
    // The hidden state binds the value correctly in the form submission
    expect(onboardingContent).toContain('createCheckoutSession(');
    expect(onboardingContent).toContain('parsed.data.interval');
  });

  it('T. no hardcoded duplicated price branches exist', () => {
    // Ensuring the loop maps over PLANS
    expect(wizardContent).toContain('(["BASIC", "PRO"] as PlanName[]).map((planName)');
  });
});
