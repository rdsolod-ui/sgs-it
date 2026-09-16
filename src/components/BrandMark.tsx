/** Four business modules around a single blue core. Shared flat brand geometry. */
export function BrandMark({className=''}:{className?:string}) {
 return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <g fill="currentColor"><rect x="3" y="3" width="27" height="27" rx="6"/><rect x="34" y="3" width="27" height="27" rx="6"/><rect x="3" y="34" width="27" height="27" rx="6"/><rect x="34" y="34" width="27" height="27" rx="6"/></g>
  <circle cx="32" cy="32" r="12" fill="#2859d9"/>
 </svg>;
}
