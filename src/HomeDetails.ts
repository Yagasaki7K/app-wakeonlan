import { useCallback, useEffect, useMemo, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
type Device = { ip: string; mac: string; name?: string; vendor?: string; online: boolean }
const Global = createGlobalStyle`
  * { box-sizing: border-box } html, body, #root { min-height: 100%; margin: 0; background: #09090b; color: #fafafa; font-family: Inter, system-ui, sans-serif }
  button, input { font: inherit } ::selection { background: #a3e635; color: #18181b }
`
const Page = styled.main`
  min-height: 100vh; padding: clamp(18px, 3vw, 36px) clamp(12px, 3vw, 32px) 54px; background: radial-gradient(ellipse at 50% -15%, #a3e63512, transparent 42%), #09090b;
  .wrap { width: 100%; max-width: 1080px; margin: auto }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; padding-bottom: 22px }
  .brand { display: flex; align-items: center; gap: 12px } .logo { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #a3e635; color: #18181b; font-size: 23px; font-weight: 800 }
  h1 { margin: 0; font-size: 16px } .sub { margin-top: 4px; color: #71717a; font-size: 12px } .relaystatus { color: #a1a1aa; font-size: 12px }
  .dot, .led { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: #a3e635 }
  .intro { display: flex; justify-content: space-between; align-items: end; gap: 16px; padding: 40px 0 24px } h2 { margin: 0; font-size: clamp(27px,5vw,38px); letter-spacing: -.05em } .desc { margin: 8px 0 0; color: #71717a; font-size: 14px }
  button { color: inherit; cursor: pointer; border: 1px solid #3f3f46; border-radius: 9px; background: #18181b; padding: 10px 14px; transition: .18s } button:hover { background: #27272a; border-color: #71717a } button:active { transform: scale(.98) } button:disabled { opacity: .55; cursor: wait }
  .primary { color: #18181b; background: #a3e635; border-color: #a3e635; font-weight: 650 } .primary:hover { background: #bef264; border-color: #bef264 }
  .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 4px 0 22px } .stat { padding: 15px 17px; background: #111113; border: 1px solid #27272a; border-radius: 11px } .value { font-size: 23px; font-weight: 650 } .label { color: #71717a; font-size: 12px; margin-top: 4px }
  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px } input { width: 100%; border: 1px solid #27272a; background: #111113; color: #fafafa; border-radius: 9px; padding: 10px 12px; outline: 0 } input:focus { border-color: #71717a } .count { color: #71717a; font-size: 12px; white-space: nowrap }
  .title { display: flex; justify-content: space-between; padding: 4px 2px 10px; color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: .06em } .title small { text-transform: none; letter-spacing: 0; color: #52525b }
  .list { display: grid; gap: 8px } .device { width: 100%; display: grid; grid-template-columns: 40px minmax(0,1fr) auto; align-items: center; gap: 13px; padding: 13px; text-align: left; background: #111113; border-color: #27272a }
  .icon { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid #27272a; border-radius: 10px; color: #a3e635; font-size: 18px }
  .name { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600 } .address { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; color: #71717a; font: 11px ui-monospace,monospace }
  .status { color: #71717a; font-size: 11px; white-space: nowrap } .status.on { color: #bef264 } .status.on .led { background: #a3e635 } .status .led { background: #52525b; margin-right: 6px }
  .empty, .notice { padding: 24px; border: 1px dashed #3f3f46; border-radius: 11px; text-align: center; color: #a1a1aa; font-size: 13px; line-height: 1.55 } .empty p { margin: 7px auto 0; max-width: 430px; color: #71717a; font-size: 12px }
  .notice { margin-bottom: 14px; border-style: solid; text-align: left } .error { color: #fca5a5; border-color: #7f1d1d } .success { color: #bef264; border-color: #365314 }
  .panel { margin-top: 18px; border: 1px solid #27272a; border-radius: 11px; background: #111113; padding: 14px } .panelhead { display: flex; justify-content: space-between; align-items: center } .hint { margin-top: 7px; color: #71717a; font-size: 11px; line-height: 1.5 } .edit { display: flex; gap: 8px; margin-top: 12px } .edit input { min-width: 0; font-size: 12px }
  footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 26px; padding-top: 14px; border-top: 1px solid #27272a; color: #52525b; font-size: 11px } footer button { border: 0; padding: 0; background: none; color: #a1a1aa }
  .shade { position: fixed; z-index: 4; inset: 0; display: grid; place-items: center; padding: 18px; background: #0009; backdrop-filter: blur(6px) } .modal { width: min(100%,420px); padding: 21px; background: #111113; border: 1px solid #3f3f46; border-radius: 14px; box-shadow: 0 24px 80px #0009 } .modalhead { display: flex; justify-content: space-between; gap: 10px } .modal h3 { margin: 0; font-size: 18px } .modal p { margin: 5px 0 12px; color: #71717a; font-size: 12px } .detail { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #27272a; padding: 11px 0; font-size: 12px } .detail span { color: #71717a } code { text-align: right; overflow-wrap: anywhere } .actions { display: grid; gap: 8px; margin-top: 18px } .close { border: 0; background: transparent; font-size: 21px; padding: 0 5px; color: #a1a1aa }
  @media(max-width:720px) {
    padding: 20px 16px 38px;
    .intro { align-items:flex-start; flex-direction:column; padding:30px 0 20px }
    .intro > div { max-width: 620px }
    .stats { gap:8px; margin-bottom:18px }
    .stat { padding:13px 14px }
    .device { grid-template-columns:36px minmax(0,1fr) auto; gap:10px; padding:12px }
    .icon { width:34px; height:34px }
    .address { display:grid; gap:3px }
  }
  @media(max-width:480px) {
    padding: 16px 12px 32px;
    header { padding-bottom:16px }
    .brand { gap:9px; min-width:0 }
    .logo { width:36px; height:36px; border-radius:10px; font-size:21px; flex:0 0 auto }
    h1 { font-size:15px }
    .sub { font-size:11px }
    .relaystatus { display:none }
    .intro { gap:14px; padding-top:26px }
    h2 { font-size:clamp(25px, 8vw, 34px); line-height:1.08 }
    .desc { font-size:13px; line-height:1.5 }
    .intro > button { width:100%; min-height:44px }
    .stats { gap:6px; margin:2px 0 17px }
    .stat { min-width:0; padding:10px 9px; border-radius:9px }
    .value { font-size:20px }
    .label { font-size:10px; line-height:1.25; overflow-wrap:anywhere }
    .toolbar { gap:8px; margin-bottom:13px }
    input { min-width:0; padding:10px }
    .count { font-size:11px }
    .title { gap:8px; font-size:11px }
    .title small { text-align:right; font-size:10px }
    .list { gap:7px }
    .device { grid-template-columns:32px minmax(0,1fr) auto; gap:8px; padding:10px; border-radius:9px }
    .icon { width:30px; height:30px; font-size:16px; border-radius:8px }
    .name { min-width:0; gap:5px; font-size:13px; overflow-wrap:anywhere }
    .address { min-width:0; font-size:10px; overflow-wrap:anywhere }
    .status { font-size:0 }
    .status .led { width:7px; height:7px; margin:0 2px 0 0 }
    .empty, .notice { padding:18px 14px; font-size:12px }
    .panel { padding:12px; margin-top:14px }
    .panelhead { gap:8px; font-size:13px }
    .panelhead button { padding:8px 10px }
    .hint { font-size:10px }
    .edit { gap:6px; flex-wrap:wrap }
    .edit input { flex:1 1 170px; width:auto }
    .edit button { flex:0 0 auto }
    footer { flex-direction:column; gap:8px; margin-top:20px }
    footer button { align-self:flex-start; min-height:32px }
    .shade { padding:10px }
    .modal { max-height:calc(100dvh - 20px); overflow-y:auto; padding:17px; border-radius:12px }
    .modal h3 { font-size:17px; overflow-wrap:anywhere }
    .detail { gap:8px; font-size:11px }
  }
  @media(max-width:360px) {
    padding: 12px 10px 28px;
    .stats { gap:5px }
    .stat { padding:9px 7px }
    .value { font-size:18px }
    .label { font-size:9px }
    .count { max-width:58px; white-space:normal; text-align:right; line-height:1.2 }
    .device { grid-template-columns:29px minmax(0,1fr) 10px; gap:7px; padding:9px }
    .icon { width:28px; height:28px; font-size:15px }
    .status .led { width:7px; height:7px }
    .title small { max-width:65%; overflow-wrap:anywhere }
    .modal { padding:14px }
    .detail { align-items:flex-start }
    .detail span { flex:0 0 76px }
  }
  @media(max-height:600px) and (max-width:720px) {
    .shade { align-items:start; overflow-y:auto }
    .modal { margin:auto 0 }
  }
`
const base = localStorage.getItem('network-waker-relay') || 'http://localhost:8787'
const label = (d: Device) => d.name || d.vendor || 'Unknown device'
export function HomeDetails() {
  const [relay, setRelay] = useState(base), [draft, setDraft] = useState(base)
  const [devices, setDevices] = useState<Device[]>([]), [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('network-waker-favorites') || '[]'))
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [query, setQuery] = useState(''), [selected, setSelected] = useState<Device | null>(null), [edit, setEdit] = useState(false), [last, setLast] = useState('')
  const scan = useCallback(async () => {
    setLoading(true); setError(''); setNotice('')
    try { const res = await fetch(relay.replace(/\/$/, '') + '/api/devices', { signal: AbortSignal.timeout(30000) }); if (!res.ok) throw Error('Relay returned HTTP ' + res.status); const data = await res.json(); setDevices(Array.isArray(data.devices) ? data.devices : []); setLast(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reach the relay.') } finally { setLoading(false) }
  }, [relay])
  useEffect(() => { void scan() }, [scan])
  useEffect(() => { localStorage.setItem('network-waker-favorites', JSON.stringify(favorites)) }, [favorites])
  const visible = useMemo(() => devices.filter(d => [label(d),d.ip,d.mac,d.vendor||''].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b) => Number(favorites.includes(b.mac.toLowerCase()))-Number(favorites.includes(a.mac.toLowerCase())) || Number(b.online)-Number(a.online) || a.ip.localeCompare(b.ip,undefined,{numeric:true})), [devices,favorites,query])
  const fav = (d: Device) => favorites.includes(d.mac.toLowerCase())
  const toggle = (d: Device) => setFavorites(old => fav(d) ? old.filter(x => x !== d.mac.toLowerCase()) : [...old,d.mac.toLowerCase()])
  async function wake(d: Device) { try { const res = await fetch(relay.replace(/\/$/,'')+'/api/wake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mac:d.mac}),signal:AbortSignal.timeout(10000)}); const data=await res.json(); if(!res.ok) throw Error(data.error||'Wake request failed'); setNotice('Wake packet sent to '+label(d)+'.'); setSelected(null) } catch(e) { setNotice(e instanceof Error?e.message:'Could not send wake packet.') } }
  async function copy(d: Device) { const text=label(d)+'\nIP: '+d.ip+'\nMAC: '+d.mac; try { await navigator.clipboard.writeText(text); setNotice('Device details copied.') } catch { setNotice(text) } }
  function saveRelay() { const url=draft.trim().replace(/\/$/,''); if(!/^https?:\/\//i.test(url)){setError('Relay URL must start with http:// or https://.');return} localStorage.setItem('network-waker-relay',url);setRelay(url);setDraft(url);setEdit(false) }
  const online=devices.filter(d=>d.online).length
  return <><Global/><Page><div className="wrap">
    <header><div className="brand"><div className="logo">⌁</div><div><h1>Network Waker</h1><div className="sub">Local network · Wake-on-LAN</div></div></div><div className="relaystatus"><i className="dot"/> Local network relay</div></header>
    <section className="intro"><div><h2>Your network, at a glance.</h2><p className="desc">Find devices on your network and wake them with one tap.</p></div><button className="primary" onClick={()=>void scan()} disabled={loading}>{loading?'◌ Scanning…':'↻  Scan network'}</button></section>
    <div className="stats"><div className="stat"><div className="value">{devices.length}</div><div className="label">Devices found</div></div><div className="stat"><div className="value" style={{color:'#bef264'}}>{online}</div><div className="label">Online now</div></div><div className="stat"><div className="value" style={{color:'#facc15'}}>{favorites.length}</div><div className="label">Favorites</div></div></div>
    {error&&<div className="notice error"><b>Couldn’t reach relay.</b> {error} Configure its LAN address below.</div>}{notice&&<div className="notice success">{notice}</div>}
    <div className="toolbar"><input aria-label="Search devices" placeholder="Search devices…" value={query} onChange={e=>setQuery(e.target.value)}/><span className="count">{visible.length} devices</span></div>
    <div className="title"><span>Devices</span><small>{last?'Last scan '+last:'Waiting for first scan'}</small></div>
    {visible.length?<div className="list">{visible.map(d=><button className="device" key={d.mac} onClick={()=>setSelected(d)}><span className="icon">⌘</span><span><span className="name">{label(d)}{fav(d)&&<span style={{color:'#facc15'}}>★</span>}</span><span className="address"><span>{d.ip}</span><span>{d.mac}</span></span></span><span className={'status '+(d.online?'on':'')}><i className="led"/>{d.online?'Online':'Offline'}　›</span></button>)}</div>:<div className="empty"><b>{loading?'Looking for devices…':query?'No matching devices':'No devices to show yet'}</b><p>{loading?'The relay is checking your local subnet. This may take a few seconds.':query?'Try a different device name, IP, or MAC address.':'Start the relay on a computer or always-on device on this Wi-Fi, then scan again.'}</p></div>}
    <section className="panel"><div className="panelhead"><b>Network relay</b><button onClick={()=>setEdit(v=>!v)}>{edit?'Cancel':'Configure'}</button></div><div className="hint">The relay scans your LAN and sends WoL packets. On Android, set its LAN address, for example http://192.168.1.20:8787.</div>{edit&&<div className="edit"><input aria-label="Relay address" placeholder="http://192.168.1.20:8787" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={saveRelay}>Save</button></div>}</section>
    <footer><span>Favorites are saved on this device.</span><button onClick={()=>{setEdit(true);window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}}>Relay settings</button></footer>
  </div></Page>
  {selected&&<div className="shade" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label={label(selected)}><div className="modalhead"><div><h3>{label(selected)}</h3><p>{selected.online?'Online on your network':'Currently offline'}</p></div><button className="close" onClick={()=>setSelected(null)}>×</button></div><div className="detail"><span>IP address</span><code>{selected.ip}</code></div><div className="detail"><span>MAC address</span><code>{selected.mac}</code></div><div className="detail"><span>Manufacturer</span><code>{selected.vendor||'Unknown'}</code></div><div className="actions"><button className="primary" onClick={()=>void wake(selected)}>⚡ Wake device</button><button onClick={()=>toggle(selected)}>{fav(selected)?'★ Remove from favorites':'☆ Add to favorites'}</button><button onClick={()=>void copy(selected)}>▣ Copy details</button></div></section></div>}</>
}
