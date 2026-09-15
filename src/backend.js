import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  "https://sieeolvhcmqvumviqqjy.supabase.co",
  "sb_publishable_A2MDeR33S6kUY-F4Yejmsg_gsnCohCC",
);
export async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
