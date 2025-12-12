# Prisma to Supabase Migration Patterns

## Import Changes
```typescript
// OLD
import { prisma } from '@/lib/prisma'
import { SomeType } from '@prisma/client'

// NEW
import { supabase } from '@/lib/supabase'
import type { SomeType } from '@/types'
```

## Query Patterns

### findMany()
```typescript
// OLD
const items = await prisma.tableName.findMany({
  where: { field: value },
  orderBy: [{ date: 'desc' }],
})

// NEW
const { data: items, error } = await supabase
  .from('TableName')
  .select('*')
  .eq('field', value)
  .order('date', { ascending: false })

if (error) throw error
```

### findFirst() / findUnique()
```typescript
// OLD
const item = await prisma.tableName.findFirst({
  where: { id: value },
  select: { field: true },
})

// NEW
const { data: item } = await supabase
  .from('TableName')
  .select('field')
  .eq('id', value)
  .limit(1)
  .single()
```

### create()
```typescript
// OLD
const item = await prisma.tableName.create({
  data: {
    field1: value1,
    field2: value2,
  },
})

// NEW
const { data: item, error } = await supabase
  .from('TableName')
  .insert({
    field1: value1,
    field2: value2,
  })
  .select()
  .single()

if (error) throw error
```

### update()
```typescript
// OLD
const item = await prisma.tableName.update({
  where: { id: value },
  data: { field: newValue },
})

// NEW
const { data: item, error } = await supabase
  .from('TableName')
  .update({ field: newValue })
  .eq('id', value)
  .select()
  .single()

if (error) throw error
```

### delete()
```typescript
// OLD
await prisma.tableName.delete({
  where: { id: value },
})

// NEW
const { error } = await supabase
  .from('TableName')
  .delete()
  .eq('id', value)

if (error) throw error
```

## Date Handling
```typescript
// When inserting dates
date: someDate.toISOString()

// When filtering dates
.gte('date', startDate.toISOString())
.lte('date', endDate.toISOString())
```

## Error Handling
Always check for errors after Supabase calls:
```typescript
const { data, error } = await supabase.from('Table').select()
if (error) throw error
```
