import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';
const $ = id => document.getElementById(id);
const industries = ['Automekaniker','Elektriker','Ejendomsservice','Flytning','Gartner','Gulvlægger','IT og teknik','Maler','Murer','Rengøring','Tagdækker','Tømrer','Transport','VVS','Andet'];
const status = (id,value) => { $(id).textContent = value; };
const el = (tag,cls,value) => { const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node; };
for (const id of ['industry','jobIndustry','companyIndustry']) for (const name of industries) $(id).add(new Option(name,name));
$('year').textContent = new Date().getFullYear();
let client,user;
function makeCompany(item){
 const card=el('article','kr-market-card');
 card.append(el('span','kr-mini-label',item.industry),el('h3','',item.company_name),el('p','',item.description||item.work_type),el('p','kr-market-meta',item.work_type+' · '+item.city+' · '+item.region));
 const contact=el('div','kr-contact');
 const email=el('a','',item.contact_email);email.href='mailto:'+item.contact_email;
 const phone=el('a','',item.phone);phone.href='tel:'+item.phone.replace(/[^+0-9]/g,'');
 contact.append(email,phone);
 if(item.website && /^https:\/\//i.test(item.website)){const link=el('a','','Hjemmeside ↗');link.href=item.website;link.target='_blank';link.rel='noopener noreferrer';contact.append(link);}
 card.append(contact);return card;
}
let companies=[];
function renderCompanies(){
 const q=$('search').value.trim().toLocaleLowerCase('da');
 const items=companies.filter(x=>(!$('industry').value||x.industry===$('industry').value)&&(!$('region').value||x.region===$('region').value)&&(!q||[x.company_name,x.industry,x.work_type,x.city,x.description].join(' ').toLocaleLowerCase('da').includes(q)));
 $('companyCards').replaceChildren(...items.map(makeCompany));
 status('listStatus',items.length?items.length+' virksomhed(er) matcher din søgning.':'Ingen aktive, godkendte virksomheder matcher endnu.');
}
['search','industry','region'].forEach(id=>$(id).addEventListener('input',renderCompanies));
async function loadCompanies(){
 const {data,error}=await client.from('kr_service_listings').select('company_name,industry,work_type,description,city,region,contact_email,phone,website').eq('approved',true).gt('subscription_until',new Date().toISOString()).order('created_at',{ascending:false});
 if(error){status('listStatus','Kunne ikke hente virksomheder lige nu.');return;}
 companies=data||[];renderCompanies();
}
async function loadJobs(){
 if(!user){status('publicJobStatus','Kun godkendte virksomheder med aktivt abonnement kan se kundeopgaver.');return;}
 const {data:active}=await client.from('kr_service_listings').select('id').eq('user_id',user.id).eq('approved',true).gt('subscription_until',new Date().toISOString()).maybeSingle();
 if(!active){status('publicJobStatus','Kun godkendte virksomheder med aktivt abonnement kan se kundeopgaver.');return;}
 const {data,error}=await client.from('kr_jobs').select('id,title,description,city,industry,work_type,created_at').eq('status','published').order('created_at',{ascending:false}).limit(30);
 if(error){status('publicJobStatus','Log ind for at se offentliggjorte opgaver.');return;}
 const {data:contacts}=await client.from('kr_job_contacts').select('job_id,email,phone').in('job_id',(data||[]).map(x=>x.id));
 $('publicJobs').replaceChildren(...(data||[]).map(x=>{const card=el('article','kr-market-card');card.append(el('span','kr-mini-label',x.industry),el('h3','',x.title),el('p','',x.description),el('p','kr-market-meta',[x.work_type,x.city].filter(Boolean).join(' · ')));const contact=(contacts||[]).find(c=>c.job_id===x.id);if(contact){const links=el('div','kr-contact');const mail=el('a','','Skriv til kunden');mail.href='mailto:'+contact.email;const tel=el('a','',contact.phone);tel.href='tel:'+contact.phone.replace(/[^+0-9]/g,'');links.append(mail,tel);card.append(links);}return card;}));
 status('publicJobStatus',(data||[]).length?'':'Ingen offentliggjorte opgaver endnu.');
}
async function loadMyJobs(){
 if(!user)return;
 const {data}=await client.from('kr_jobs').select('id,title,status').eq('customer_id',user.id).order('created_at',{ascending:false}).limit(20);
 const box=$('myJobs');box.replaceChildren(el('h3','','Mine opslag'));
 for(const job of data||[]){
  const row=el('div','kr-job-row');row.append(el('span','',job.title+' · '+(job.status==='published'?'Offentlig':'Lukket')));
  const btn=el('button','outline',job.status==='published'?'Luk opslag':'Genåbn');btn.type='button';
  btn.addEventListener('click',async()=>{btn.disabled=true;const {error}=await client.from('kr_jobs').update({status:job.status==='published'?'closed':'published'}).eq('id',job.id).eq('customer_id',user.id);if(error)status('jobStatus',error.message);await loadMyJobs();await loadJobs();});
  row.append(btn);box.append(row);
 }
}
async function requireUser(type){
 const {data:{user:current},error}=await client.auth.getUser();
 if(error||!current||!current.email_confirmed_at){throw new Error('Du skal oprette en konto og bekræfte din e-mail først. Gå til Min konto.');}
 const {data:profile}=await client.from('kr_profiles').select('account_type').eq('user_id',current.id).maybeSingle();
 if(profile?.account_type!==type)throw new Error('Vælg kontotypen '+(type==='person'?'Privatperson':'Virksomhed')+' og gem profilen under Min konto først.');
 return current;
}
$('jobForm').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;const btn=form.querySelector('button[type=submit]');btn.disabled=true;status('jobStatus','Gemmer dit opslag…');
 try{
  const current=await requireUser('person');
  if(!$('jobConsent').checked)throw new Error('Du skal acceptere deling af kontaktoplysninger.');
  const payload={customer_id:current.id,title:$('jobTitle').value.trim(),description:$('jobDescription').value.trim(),work_type:$('jobType').value.trim(),industry:$('jobIndustry').value,city:$('jobCity').value.trim(),address:$('jobAddress').value.trim(),status:'draft',share_phone_with_verified_companies:true};
  const {data,error}=await client.from('kr_jobs').insert(payload).select('id').single();if(error)throw error;
  const {error:contactError}=await client.from('kr_job_contacts').insert({job_id:data.id,email:$('jobEmail').value.trim(),phone:$('jobPhone').value.trim()});
  if(contactError){await client.from('kr_jobs').delete().eq('id',data.id);throw contactError;}
  const {error:publishError}=await client.from('kr_jobs').update({status:'published'}).eq('id',data.id);if(publishError)throw publishError;
  form.reset();status('jobStatus','Dit opslag er oprettet. Kun godkendte betalende virksomheder kan se din e-mail og telefon.');await loadMyJobs();await loadJobs();
 }catch(err){status('jobStatus',err.message||'Kunne ikke oprette opslag.');}finally{btn.disabled=false;}
});
$('companyForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;status('companyStatus','Gemmer virksomhedsprofil…');
 try{
  const current=await requireUser('company');
  const payload={company_name:$('companyName').value.trim(),cvr:$('companyCvr').value.trim(),industry:$('companyIndustry').value,work_type:$('companyWork').value.trim(),description:$('companyDescription').value.trim(),city:$('companyCity').value.trim(),region:$('companyRegion').value,contact_email:$('companyEmail').value.trim(),phone:$('companyPhone').value.trim(),website:$('companyWebsite').value.trim()};
  const {data:existing,error:lookupError}=await client.from('kr_service_listings').select('id,approved,subscription_until').eq('user_id',current.id).maybeSingle();if(lookupError)throw lookupError;
  const result=existing?await client.from('kr_service_listings').update(payload).eq('id',existing.id).eq('user_id',current.id):await client.from('kr_service_listings').insert({...payload,user_id:current.id});
  if(result.error)throw result.error;
  status('companyStatus','Profil gemt. Fortsætter til abonnement…');location.assign('/priser.html#betaling');
 }catch(err){status('companyStatus',err.message||'Kunne ikke gemme virksomheden.');}finally{btn.disabled=false;}
});
async function init(){
 const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
 client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 const {data}=await client.auth.getUser();user=data.user;
 if(!user){status('jobStatus','Log ind under Min konto for at oprette en opgave.');status('companyStatus','Log ind som virksomhed under Min konto for at oprette en profil.');}
 else{
  const {data:profile}=await client.from('kr_profiles').select('account_type,display_name,company_name,cvr,phone,address').eq('user_id',user.id).maybeSingle();
  if(profile){
 const person=profile.account_type==='person', company=profile.account_type==='company';
 $('opret-opslag').style.display=person?'':'none';$('opret-virksomhed').style.display=company?'':'none';$('companyJobsSection').style.display=company?'':'none';
 $('jobHeroLink').href=person?'#opret-opslag':company?'#opret-virksomhed':'/konto.html';$('jobHeroLink').textContent=person?'Opret en opgave →':company?'Stil dig til rådighed →':'Vælg kontotype →';
 if(person)document.querySelectorAll('nav a[href="/"]').forEach(a=>a.style.display='none');
 $('jobEmail').value=user.email||'';$('jobPhone').value=profile.phone||'';$('jobAddress').value=profile.address||'';$('companyName').value=profile.company_name||'';$('companyCvr').value=profile.cvr||'';$('companyPhone').value=profile.phone||'';$('companyEmail').value=user.email||'';}
  if(profile?.account_type==='person')await loadMyJobs();
  const {data:listing}=await client.from('kr_service_listings').select('*').eq('user_id',user.id).maybeSingle();
  if(listing){for(const [id,key] of [['companyName','company_name'],['companyCvr','cvr'],['companyIndustry','industry'],['companyWork','work_type'],['companyDescription','description'],['companyCity','city'],['companyRegion','region'],['companyEmail','contact_email'],['companyPhone','phone'],['companyWebsite','website']])$(id).value=listing[key]||'';status('companyStatus',listing.approved&&new Date(listing.subscription_until)>new Date()?'Din profil er aktiv.':'Din profil er gemt, men ikke offentlig: abonnement og godkendelse mangler.');}
 }
 await Promise.all([loadCompanies(),loadJobs()]);
}
init().catch(err=>{status('listStatus','Kunne ikke starte tjenesten. Prøv igen senere.');console.error(err);});
