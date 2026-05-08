import { supabase } from '@/lib/supabase'
 
// ─── AUTH ────────────────────────────────────────────────────────────────────
 
const auth = {
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  },
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? '',
    }
  },
  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  register: async ({ email, password, full_name }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } }
    })
    if (error) throw error
    return data
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
 
// ─── ENTITY FACTORY ──────────────────────────────────────────────────────────
// Creates a Base44-compatible API object for any Supabase table.
// Usage: const Client = createEntity('clients')
 
function createEntity(table) {
  return {
    // filter({ field: value, ... }) → array of rows
    filter: async (filters = {}) => {
      let query = supabase.from(table).select('*')
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
 
    // list() → all rows (alias for filter with no args)
    list: async () => {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      return data ?? []
    },
 
    // get(id) → single row or null
    get: async (id) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      if (error) return null
      return data
    },
 
    // create({ ...fields }) → created row
    create: async (fields) => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = user ? { ...fields, user_id: user.id } : fields
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
 
    // update(id, { ...fields }) → updated row
    update: async (id, fields) => {
      const { data, error } = await supabase
        .from(table)
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
 
    // delete(id) → void
    delete: async (id) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
      if (error) throw error
      return {}
    },
  }
}
 
// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────
 
const integrations = {
  Core: {
    UploadFile: async (file) => {
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user?.id ?? 'anon'}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path)
      return { file_url: publicUrl }
    }
  }
}
 
// ─── ENTITIES ────────────────────────────────────────────────────────────────
// Mapped 1-to-1 from your Base44 entity definitions.
 
const entities = {
  Listing:      createEntity('listings'),
  Message:      createEntity('messages'),
  Friendship:   createEntity('friendships'),
  ListingShare: createEntity('listing_shares'),
  Rating:       createEntity('ratings'),
  SavedListing: createEntity('saved_listings'),
  UserInterest: createEntity('user_interests'),
}
 
// ─── EXPORTS ─────────────────────────────────────────────────────────────────
// Drop-in replacement for the old Base44 `db` object.
 
export const db = { auth, entities, integrations }
export const base44 = db
export default db
 