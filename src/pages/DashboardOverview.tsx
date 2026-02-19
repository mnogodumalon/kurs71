import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, DoorOpen, GraduationCap, TrendingUp, Users, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse, Anmeldungen, Dozenten, Teilnehmer, Raeume } from '@/types/app';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardOverview() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      LivingAppsService.getKurse(),
      LivingAppsService.getAnmeldungen(),
      LivingAppsService.getDozenten(),
      LivingAppsService.getTeilnehmer(),
      LivingAppsService.getRaeume(),
    ]).then(([k, a, d, t, r]) => {
      setKurse(k);
      setAnmeldungen(a);
      setDozenten(d);
      setTeilnehmer(t);
      setRaeume(r);
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const aktiveKurse = kurse.filter(k => {
    if (!k.fields.startdatum) return false;
    const start = parseISO(k.fields.startdatum);
    const end = k.fields.enddatum ? parseISO(k.fields.enddatum) : null;
    return (isToday(start) || isBefore(start, now)) && (!end || isAfter(end, now));
  });
  const kommendeKurse = kurse.filter(k => {
    if (!k.fields.startdatum) return false;
    return isAfter(parseISO(k.fields.startdatum), now);
  });
  const bezahlt = anmeldungen.filter(a => a.fields.bezahlt === true).length;
  const offen = anmeldungen.filter(a => !a.fields.bezahlt).length;

  const umsatz = kurse.reduce((sum, k) => {
    const kursAnmeldungen = anmeldungen.filter(a => a.fields.kurs && a.fields.kurs.includes(k.record_id));
    const bezahlteAnmeldungen = kursAnmeldungen.filter(a => a.fields.bezahlt);
    return sum + bezahlteAnmeldungen.length * (k.fields.preis ?? 0);
  }, 0);

  const monthCounts: Record<string, number> = {};
  kommendeKurse.forEach(k => {
    if (!k.fields.startdatum) return;
    const label = format(parseISO(k.fields.startdatum), 'MMM', { locale: de });
    monthCounts[label] = (monthCounts[label] ?? 0) + 1;
  });
  const chartData = Object.entries(monthCounts).map(([name, count]) => ({ name, count }));

  const stats = [
    { label: 'Kurse gesamt', value: kurse.length, sub: `${aktiveKurse.length} aktiv · ${kommendeKurse.length} kommend`, icon: BookOpen, gradient: 'stat-gradient-1', href: '/kurse' },
    { label: 'Anmeldungen', value: anmeldungen.length, sub: `${bezahlt} bezahlt · ${offen} offen`, icon: ClipboardList, gradient: 'stat-gradient-2', href: '/anmeldungen' },
    { label: 'Teilnehmer', value: teilnehmer.length, sub: 'registrierte Personen', icon: Users, gradient: 'stat-gradient-3', href: '/teilnehmer' },
    { label: 'Dozenten', value: dozenten.length, sub: `${raeume.length} Räume verfügbar`, icon: GraduationCap, gradient: 'stat-gradient-4', href: '/dozenten' },
  ];

  const quickLinks = [
    { label: 'Kurse verwalten', href: '/kurse', icon: BookOpen, desc: 'Kurse anlegen & bearbeiten' },
    { label: 'Dozenten', href: '/dozenten', icon: GraduationCap, desc: 'Dozenten & Fachgebiete' },
    { label: 'Teilnehmer', href: '/teilnehmer', icon: Users, desc: 'Teilnehmerliste pflegen' },
    { label: 'Räume', href: '/raeume', icon: DoorOpen, desc: 'Räume & Kapazitäten' },
    { label: 'Anmeldungen', href: '/anmeldungen', icon: ClipboardList, desc: 'Buchungen & Zahlungen' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Daten werden geladen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="hero-gradient rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 50%)' }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-2">Willkommen zurück</p>
              <h1 className="text-3xl font-bold tracking-tight mb-1">KursManager</h1>
              <p className="text-white/75 text-base">
                {kurse.length} Kurse · {teilnehmer.length} Teilnehmer · {dozenten.length} Dozenten
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Umsatz (bezahlt)</p>
              <p className="text-4xl font-bold tracking-tight">
                {umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
              <CheckCircle2 size={14} /><span>{bezahlt} Zahlungen eingegangen</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
              <Clock size={14} /><span>{offen} Zahlungen ausstehend</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm">
              <TrendingUp size={14} /><span>{aktiveKurse.length} Kurse laufen gerade</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.href} className={`${stat.gradient} rounded-xl p-5 text-white group hover:scale-[1.02] transition-transform`}>
            <div className="flex items-start justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2"><stat.icon size={18} /></div>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-70 transition-opacity mt-1" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-white/90 text-sm font-medium mt-0.5">{stat.label}</p>
            <p className="text-white/60 text-xs mt-1">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3 card-elegant p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-lg tracking-tight">Kommende Kurse</h2>
              <p className="text-muted-foreground text-sm">{kommendeKurse.length} Kurse geplant</p>
            </div>
            <Link to="/kurse" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Alle <ArrowRight size={14} />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={32}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 13 }}
                  formatter={(v: number) => [v, 'Kurse']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? 'oklch(0.48 0.22 264)' : 'oklch(0.60 0.18 264)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Noch keine kommenden Kurse eingetragen
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="lg:col-span-2 card-elegant p-6">
          <h2 className="font-bold text-lg tracking-tight mb-5">Schnellzugriff</h2>
          <div className="space-y-1.5">
            {quickLinks.map(link => (
              <Link key={link.href} to={link.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <link.icon size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Active courses */}
      {aktiveKurse.length > 0 && (
        <div className="card-elegant p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-lg tracking-tight">Aktive Kurse</h2>
              <p className="text-muted-foreground text-sm">Kurse die gerade laufen</p>
            </div>
            <Link to="/kurse" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Alle Kurse <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {aktiveKurse.slice(0, 5).map(kurs => {
              const kursAnmeldungen = anmeldungen.filter(a => a.fields.kurs && a.fields.kurs.includes(kurs.record_id));
              const bezahlteCount = kursAnmeldungen.filter(a => a.fields.bezahlt).length;
              return (
                <div key={kurs.record_id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{kurs.fields.titel}</p>
                      <p className="text-xs text-muted-foreground">
                        {kurs.fields.startdatum && format(parseISO(kurs.fields.startdatum), 'dd. MMM', { locale: de })}
                        {kurs.fields.enddatum && ` – ${format(parseISO(kurs.fields.enddatum), 'dd. MMM yyyy', { locale: de })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold">{kursAnmeldungen.length} Anmeldungen</p>
                      <p className="text-xs text-muted-foreground">{bezahlteCount} bezahlt</p>
                    </div>
                    {kurs.fields.preis != null && (
                      <span className="text-sm font-bold text-primary">
                        {kurs.fields.preis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
