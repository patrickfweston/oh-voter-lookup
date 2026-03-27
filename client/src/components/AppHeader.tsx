import { OhioFlag } from './OhioFlag'

export function AppHeader() {
  return (
    <header className="header">
      <OhioFlag className="header-flag" />
      <h1>Look up an Ohio voter</h1>
      <p className="lede">
        Search publicly available voter registration records in Ohio.
      </p>
    </header>
  )
}
