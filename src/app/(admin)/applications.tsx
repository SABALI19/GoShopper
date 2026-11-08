import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminCard, AdminError, AdminFilters, AdminLabel, AdminLoading, AdminPage, AdminSearch, AdminValue, dateLabel, humanize } from "../../components/admin/AdminUI";
import { Button } from "../../components/ui/Button";
import { adminErrorMessage, decideAdminApplication, fetchAdminApplications, type AdminApplication } from "../../features/admin/api";
import { darkColors, radius, spacing, typography } from "../../theme";

const statuses = ["", "pending_review", "under_review", "needs_information", "approved", "rejected"];
export default function AdminApplicationsScreen() {
  const router=useRouter(); const { getToken } = useAuth(); const [type, setType] = useState(""); const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [items, setItems] = useState<AdminApplication[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busyId, setBusyId] = useState(""); const [reasons, setReasons] = useState<Record<string, string>>({}); const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => { setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const data = await fetchAdminApplications(token, { type, status, q }); setItems(data.applications); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); } }, [getToken, q, status, type]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  const decide = async (app: AdminApplication, decision: "under_review" | "needs_information" | "approved" | "rejected") => { const reason = reasons[app.id]?.trim() || ""; const reviewerNotes = notes[app.id]?.trim() || ""; if (["needs_information", "rejected"].includes(decision) && !reason) { Alert.alert("Add a reason", "Enter applicant feedback before requesting information or rejecting."); return; } if (decision === "approved") { Alert.alert("Approve application?", app.type === "supermarket" ? "This creates an approved store that remains inactive until activated through store operations." : "This grants the rider role and approved rider profile.", [{ text: "Cancel", style: "cancel" }, { text: "Approve", onPress: () => void persist(app, decision, reason, reviewerNotes) }]); return; } await persist(app, decision, reason, reviewerNotes); };
  const persist = async (app: AdminApplication, decision: "under_review" | "needs_information" | "approved" | "rejected", reason: string, reviewerNotes: string) => { setBusyId(app.id); try { const token = await getToken(); if (!token) throw new Error("Sign in again."); await decideAdminApplication(token, app.id, decision, reason, reviewerNotes); await load(); } catch (e) { Alert.alert("Could not update application", adminErrorMessage(e)); } finally { setBusyId(""); } };
  return <AdminPage title="Onboarding applications" subtitle="Review supermarket and rider applications." refresh={load}>
    <AdminSearch value={q} onChangeText={setQ} placeholder="Search reference, business or applicant" />
    <AdminFilters options={[{label:"All types",value:""},{label:"Supermarkets",value:"supermarket"},{label:"Riders",value:"rider"}]} selected={type} onSelect={setType}/>
    <AdminFilters options={statuses.map(value=>({label:value?humanize(value):"All statuses",value}))} selected={status} onSelect={setStatus}/>
    {loading?<AdminLoading label="Loading applications…"/>:null}{error?<AdminError message={error} retry={()=>void load()}/>:null}
    {!loading&&!error&&!items.length?<AdminCard><AdminValue>No applications match these filters.</AdminValue></AdminCard>:null}
    {items.map(app=><AdminCard key={app.id}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:"/(admin)/application/[applicationId]",params:{applicationId:app.id}} as never)} style={styles.head}><View style={styles.flex}><AdminValue accent>{app.reference}</AdminValue><AdminLabel>{humanize(app.type)} · {dateLabel(app.createdAt)}</AdminLabel></View><Text style={styles.status}>{humanize(app.status)}</Text></Pressable>
      <AdminValue>{String(app.data.businessName||app.data.fullName||"Applicant")}</AdminValue>
      <AdminLabel>Tap application for full details and audit events.</AdminLabel>
      <Text style={styles.detail}>{String(app.data.email||"")} · {String(app.data.phone||"")}</Text>
      <Text style={styles.detail}>{String(app.data.address||"")}{app.data.city?`, ${app.data.city}`:""}{app.data.state?`, ${app.data.state}`:""}</Text>
      <Text style={styles.detail}>Category / vehicle: {String(app.data.category||app.data.vehicleType||"—")}</Text>
      {Object.entries(app.data).filter(([key])=>!['businessName','fullName','email','phone','address','city','state','category','vehicleType'].includes(key)).map(([key,value])=><Text key={key} style={styles.detail}>{humanize(key)}: {Array.isArray(value)?value.join(", "):String(value||"—")}</Text>)}
      {app.feedback?<Text style={styles.feedback}>Applicant feedback: {app.feedback}</Text>:null}
      <TextInput value={reasons[app.id]||""} onChangeText={value=>setReasons(current=>({...current,[app.id]:value}))} placeholder="Reviewer feedback / decision reason" placeholderTextColor={darkColors.placeholder} multiline style={styles.input}/>
      <TextInput value={notes[app.id]||""} onChangeText={value=>setNotes(current=>({...current,[app.id]:value}))} placeholder="Internal reviewer notes (admin only)" placeholderTextColor={darkColors.placeholder} multiline style={styles.input}/>
      <View style={styles.actions}><Button title="Review" disabled={busyId===app.id} onPress={()=>void decide(app,"under_review")}/><Button title="Request info" disabled={busyId===app.id} onPress={()=>void decide(app,"needs_information")}/><Button title="Reject" disabled={busyId===app.id} onPress={()=>void decide(app,"rejected")}/><Button title={busyId===app.id?"Working…":"Approve"} disabled={busyId===app.id} onPress={()=>void decide(app,"approved")}/></View>
      <AdminLabel>Application history</AdminLabel>{app.history.map((event,index)=><Text key={`${event.status}-${index}`} style={styles.detail}>{humanize(event.status)} · {dateLabel(event.createdAt)}{event.message?` — ${event.message}`:""}</Text>)}
    </AdminCard>)}
  </AdminPage>;
}
const styles=StyleSheet.create({head:{flexDirection:"row",justifyContent:"space-between",gap:spacing.sm},flex:{flex:1},status:{...typography.storeCaption,color:darkColors.primary},detail:{...typography.storeCaption,color:darkColors.mutedText,marginTop:spacing.xxs},feedback:{...typography.storeCaption,color:darkColors.warning,marginTop:spacing.xs},input:{minHeight:spacing.xxl,padding:spacing.sm,marginTop:spacing.sm,borderWidth:1,borderColor:darkColors.inputBorder,borderRadius:radius.input,color:darkColors.white,backgroundColor:darkColors.inputSurface,textAlignVertical:"top"},actions:{gap:spacing.xs,marginVertical:spacing.sm}});
