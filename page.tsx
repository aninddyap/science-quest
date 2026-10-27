"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase,configured} from "../lib/supabase";
type Group={id:string;name:string;code:string};
const missions=[
 {title:"🔮 Predict",subtitle:"Misi 1 — Membuat prediksi",prompt:"Dua wadah berisi es batu berukuran sama. Wadah A ditaburi garam, sedangkan wadah B tidak. Menurut kelompokmu, apa yang akan terjadi pada kedua wadah? Jelaskan alasannya.",field:"predict"},
 {title:"🧪 Observe",subtitle:"Misi 2 — Mengumpulkan bukti",prompt:"Amati kedua wadah sesuai arahan guru. Catat perubahan yang terlihat, waktu pengamatan, dan perbedaan antara wadah A dan B. Jangan mencicipi bahan.",field:"observe"},
 {title:"💡 Explain",subtitle:"Misi 3 — Menjelaskan fenomena",prompt:"Bandingkan prediksi dengan hasil pengamatan. Apakah sesuai? Jelaskan bukti dan konsep perubahan fisika yang mendukung kesimpulan kelompok.",field:"explain"}
] as const;
type Field=typeof missions[number]["field"];
type Answers={predict:string;observe:string;explain:string;quiz_answer:string};
const blank:Answers={predict:"",observe:"",explain:"",quiz_answer:""};
export default function Home(){
 const [name,setName]=useState("");const [code,setCode]=useState("");const [group,setGroup]=useState<Group|null>(null);
 const [answers,setAnswers]=useState<Answers>(blank);const [step,setStep]=useState(0);const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
 const [userId,setUserId]=useState("");const [members,setMembers]=useState<{student_name:string}[]>([]);
 useEffect(()=>{if(!supabase)return;supabase.auth.getUser().then(({data})=>{if(data.user)setUserId(data.user.id)});},[]);
 useEffect(()=>{if(!group||!supabase)return;const db=supabase;
  const refresh=async()=>{const [a,m]=await Promise.all([db.from("answers").select("predict,observe,explain,quiz_answer").eq("group_id",group.id).maybeSingle(),db.from("members").select("student_name").eq("group_id",group.id)]);if(a.data)setAnswers(a.data as Answers);if(m.data)setMembers(m.data)};
  refresh();const channel=db.channel("group-"+group.id).on("postgres_changes",{event:"*",schema:"public",table:"answers",filter:"group_id=eq."+group.id},refresh).on("postgres_changes",{event:"*",schema:"public",table:"members",filter:"group_id=eq."+group.id},refresh).subscribe();
  return()=>{db.removeChannel(channel)};
 },[group]);
 async function join(){if(!supabase)return;setBusy(true);setStatus("");try{
  let id=userId;if(!id){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;id=data.user!.id;setUserId(id)}
  const {data,error}=await supabase.rpc("join_group",{p_code:code.trim().toUpperCase(),p_name:name.trim()});if(error)throw error;
  setGroup(data as Group);
 }catch(e){setStatus(e instanceof Error?e.message:"Gagal bergabung")}finally{setBusy(false)}}
 async function save(field:Field,value:string){if(!supabase||!group)return;setStatus("Menyimpan...");const {error}=await supabase.from("answers").update({[field]:value}).eq("group_id",group.id);setStatus(error?error.message:"✓ Jawaban tersimpan dan tersinkron");}
 async function quiz(value:string){if(!supabase||!group)return;setAnswers(a=>({...a,quiz_answer:value}));const {error}=await supabase.from("answers").update({quiz_answer:value}).eq("group_id",group.id);setStatus(error?error.message:"✓ Pilihan tersimpan");}
 const done=missions.filter(m=>answers[m.field].trim().length>0).length+(answers.quiz_answer?1:0);const progress=done*25;
 return <main className="wrap"><header className="nav"><div className="brand">🧬 SCIENCE QUEST <span className="pill">POE Adventure</span></div><Link className="toplink" href="/teacher">👩‍🏫 Guru →</Link></header>
 {!group?<><section className="hero"><span className="pill">IPA Kelas VII • Sifat dan Perubahan Zat</span><h1>Jadilah detektif sains! 🔬</h1><p className="muted">Prediksi, lakukan pengamatan, dan jelaskan fenomena bersama kelompokmu. Kumpulkan XP dengan menyelesaikan misi!</p></section><div className="grid"><section className="panel"><h2>🚀 Masuk ke kelompok</h2><label>Nama panggilan murid</label><input value={name} maxLength={40} onChange={e=>setName(e.target.value)} placeholder="Contoh: Raka"/><label>Kode kelompok dari guru</label><input value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Contoh: LAB123"/><button className="btn" disabled={!configured||!name.trim()||!code.trim()||busy} onClick={join}>{busy?"Menghubungkan...":"Gabung petualangan →"}</button>{!configured&&<p className="error">Konfigurasi Supabase belum tersedia. Ikuti README untuk mengaktifkan kolaborasi.</p>}{status&&<p className="error">{status}</p>}</section><section className="panel"><h2>🏆 4 Tantangan</h2><p>🔮 Predict — 25 XP</p><p>🧪 Observe — 25 XP</p><p>💡 Explain — 25 XP</p><p>⚡ Kuis — 25 XP</p><small>Jawaban kelompok disimpan bersama secara real-time.</small></section></div></>:
 <><section className="hero"><span className="pill">Kelompok {group.name} • {group.code}</span><h1>Selamat berpetualang! ✨</h1><div className="row"><strong>🏅 {progress} / 100 XP</strong><span>{done}/4 misi selesai</span></div><div className="bar"><div className="fill" style={{width:progress+"%"}}/></div><p className="muted">Anggota: {members.map(m=>m.student_name).join(", ")||"Memuat..."}</p></section>
 <div className="steps">{[...missions.map(m=>m.title),"⚡ Kuis"].map((label,i)=><button key={label} className={"step "+(step===i?"active":"")} onClick={()=>setStep(i)}>{label}</button>)}</div>
 {step<3?(()=>{const m=missions[step];return <section className="panel"><span className="pill">{m.subtitle}</span><h2>{m.title}</h2><p>{m.prompt}</p><label>Jawaban bersama kelompok</label><textarea key={group.id+"-"+m.field} value={answers[m.field]} onChange={e=>setAnswers(a=>({...a,[m.field]:e.target.value}))} onBlur={e=>save(m.field,e.target.value)} placeholder="Diskusikan dan tulis jawaban kelompok di sini..."/><div className="row"><small>Jawaban otomatis disimpan saat kolom ditinggalkan.</small><button className="btn" onClick={()=>save(m.field,answers[m.field])}>Simpan jawaban</button></div></section>})():
 <section className="panel"><span className="pill">Misi bonus • 25 XP</span><h2>⚡ Kuis: Perubahan zat</h2><p>Manakah contoh perubahan kimia?</p>{["Es batu mencair","Air menguap","Besi berkarat","Garam larut dalam air"].map((option,i)=><label key={option} className="quiz-option"><input type="radio" name="quiz" checked={answers.quiz_answer===String(i)} onChange={()=>quiz(String(i))}/>{option}</label>)}{answers.quiz_answer!==""&&<p className={answers.quiz_answer==="2"?"success":"error"}>{answers.quiz_answer==="2"?"✓ Tepat! Besi berkarat membentuk zat baru.":"Coba lagi! Cari peristiwa yang menghasilkan zat baru."}</p>}</section>}
 <div className="row"><button className="btn secondary" disabled={step===0} onClick={()=>setStep(s=>s-1)}>← Sebelumnya</button><span className="muted">{status}</span><button className="btn" disabled={step===3} onClick={()=>setStep(s=>s+1)}>Misi berikutnya →</button></div>
 {progress===100&&<section className="panel"><h2>🏆 Selamat! Semua misi terisi!</h2><p>Kelompokmu berhasil menyelesaikan Science Quest. Guru akan meninjau jawaban ilmiah kalian.</p></section>}
 </>}
 <footer className="foot">Science Quest • LKM Digital Kolaboratif berbasis Predict–Observe–Explain</footer></main>
}
