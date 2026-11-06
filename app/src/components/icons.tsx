export function GardenMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true"><path d="M20 3 25 15 37 20 25 25 20 37 15 25 3 20 15 15 20 3Z" stroke="currentColor" strokeWidth="1.4"/><path d="m8 8 12 5 12-5-5 12 5 12-12-5-12 5 5-12L8 8Z" stroke="currentColor" strokeWidth="1"/><path d="m20 13 7 7-7 7-7-7 7-7Z" fill="currentColor"/></svg>;
}
export function CompassMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 180 180" fill="none" className={className} aria-hidden="true"><circle cx="90" cy="90" r="72" stroke="currentColor" strokeWidth=".6"/><circle cx="90" cy="90" r="55" stroke="currentColor" strokeWidth=".5" strokeDasharray="2 5"/><path d="m90 5 13 72 72 13-72 13-13 72-13-72L5 90l72-13L90 5Z" stroke="currentColor" strokeWidth=".8"/><path d="m90 32 9 49 49 9-49 9-9 49-9-49-49-9 49-9 9-49Z" fill="currentColor" fillOpacity=".18"/><path d="M90 0v12m0 156v12M0 90h12m156 0h12M26 26l9 9m110 110 9 9m0-128-9 9M35 145l-9 9" stroke="currentColor"/></svg>;
}
