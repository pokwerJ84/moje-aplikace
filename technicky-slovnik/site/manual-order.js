export function orderedManuals(rows){
  return rows.map((row,index)=>({row,index})).sort((a,b)=>{
    const left=a.row.sort_order??Number.MAX_SAFE_INTEGER,right=b.row.sort_order??Number.MAX_SAFE_INTEGER;
    return left-right||a.index-b.index;
  }).map(({row})=>row);
}
export function reorderManuals(rows,ids){
  const byId=new Map(rows.map(row=>[row.id,row]));
  if(ids.length!==rows.length||new Set(ids).size!==ids.length||ids.some(id=>!byId.has(id)))throw new Error('Invalid manual order');
  return ids.map((id,index)=>({...byId.get(id),sort_order:index}));
}
export async function saveManualOrder({supabase,user,rows,ids,store}){
  const next=reorderManuals(rows,ids);
  if(user){const {error}=await supabase.rpc('dictionary_reorder_manuals',{p_ids:ids});if(error)throw error;}
  else store(next);
  return next;
}
