import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const WRITE_METHODS = ['insert', 'update', 'delete', 'upsert']

// A chainable no-op builder: every method call returns itself, and
// awaiting it resolves to { data: null, error: null } so the app
// never throws and never writes to the database.
const makeNoOpBuilder = () => {
  const handler = {
    get (target, prop) {
      if (prop === 'then') return (onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled)
      if (prop === 'catch') return (onRejected) => Promise.resolve({ data: null, error: null }).catch(onRejected)
      if (prop === 'finally') return (onFinally) => Promise.resolve({ data: null, error: null }).finally(onFinally)
      return () => new Proxy({}, handler)
    }
  }
  return new Proxy({}, handler)
}

const rawClient = createClient(supabaseUrl, supabaseKey)

const originalFrom = rawClient.from.bind(rawClient)
rawClient.from = function (...args) {
  const builder = originalFrom(...args)
  return new Proxy(builder, {
    get (target, prop) {
      if (WRITE_METHODS.includes(prop)) {
        return (...callArgs) => {
          console.warn(`[READ-ONLY] "${String(prop)}" operation blocked on table "${args[0]}"`)
          return makeNoOpBuilder()
        }
      }
      const value = target[prop]
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

export const supabase = rawClient