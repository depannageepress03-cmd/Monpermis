import { ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { computeModuleAmount, fetchAccessMe, fetchAccessModules, redeemPromoCode, AccessRequestError, type AccessMe, type AccessModule, type AccessModuleKey, type CheckoutCartItem } from '../api/accessRequests';
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout';
;
import { PageLoader } from '../components/PageLoader';
;
;
import { useAuth } from '../hooks/useAuth';
import { useFocusRefresh } from '../hooks/useFocusRefresh';
import { Button, LogoTile, PlanCard, TextField } from '../components/ui';
import { MainTabBar } from '../components/MainTabBar';
;

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  day: ' / jour',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
};

// Three formules réellement vendues côté API (code, heures de conduite, vidéos conduite).
// Le « pack » des maquettes n'existe pas côté serveur : on ne l'invente pas.
const PRIMARY_KEYS: AccessModuleKey[] = ['code', 'conduite_heures', 'conduite_videos'];

export function AbonnementPage() {
  const { user, loading: authLoading } = useAuth();

  const [modules, setModules] = useState<AccessModule[]>([]);
  const [me, setMe] = useState<AccessMe | null>(null);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Partial<Record<AccessModuleKey, boolean>>>({});
  const [quantityByModule] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [operator, setOperator] = useState<'mtn' | 'moov'>('mtn');
  const [payPhone, setPayPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [moduleCatalog, meResult] = await Promise.all([fetchAccessModules(), fetchAccessMe()]);
      setModules(moduleCatalog.filter((m) => m.key !== 'aiChat'));
      setMe(meResult);
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  useFocusRefresh(Boolean(user), () => {
    void load();
  });

  if (authLoading || !user) return <PageLoader />;


  const cartItems: CheckoutCartItem[] = modules
    .filter((module) => {
      if (!PRIMARY_KEYS.includes(module.key)) return false;
      if (!selected[module.key]) return false;
      if (me?.access[module.key]) return false;
      return true;
    })
    .map((module) => ({
      module: module.key,
      quantity: Math.max(1, quantityByModule[module.key] ?? 1),
    }));


  const toggle = (key: AccessModuleKey) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleRedeemPromo = async () => {
    const trimmed = promoCode.trim();
    if (!trimmed) return;
    setPromoBusy(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const result = await redeemPromoCode(trimmed);
      setMe(result.access);
      const labels = result.modules
        .map((key) => modules.find((m) => m.key === key)?.label || key)
        .join(', ');
      setPromoSuccess(`Code activé : ${labels} débloqué${result.modules.length > 1 ? 's' : ''}.`);
      setPromoCode('');
    } catch (err) {
      setPromoError(err instanceof AccessRequestError ? err.message : 'Code invalide');
    } finally {
      setPromoBusy(false);
    }
  };

  const sortedModules = [...modules].sort((a, b) => {
    const ai = PRIMARY_KEYS.indexOf(a.key);
    const bi = PRIMARY_KEYS.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const selectedPlan = sortedModules.find(m => PRIMARY_KEYS.includes(m.key) && selected[m.key] && !me?.access[m.key]);
  const ctaAmount = selectedPlan ? computeModuleAmount(selectedPlan.key, selectedPlan.price, selectedPlan.key === 'conduite_heures' ? quantityByModule[selectedPlan.key] : 1) : 0;

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Choisis ta formule</h1>
            <div style={{ fontSize: 13, color: '#5B6680', fontWeight: 600, marginTop: 3 }}>Activation immédiate après paiement</div>
          </div>
          <LogoTile size="sm" />
        </div>

        {/* Plans */}
        <div className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedModules.filter(m => PRIMARY_KEYS.includes(m.key)).map((module) => {
            const isPlanActive = Boolean(me?.access[module.key]);
            const checked = Boolean(selected[module.key]);
            const amount = computeModuleAmount(module.key, module.price, module.key === 'conduite_heures' ? quantityByModule[module.key] : 1);

            return (
              <PlanCard
                key={module.key}
                name={module.label}
                description={isPlanActive ? 'Actif' : `${formatPrice(module.price)}${unitSuffix[module.unit]}`}
                price={isPlanActive ? 'Actif' : formatPrice(amount)}
                popular={false}
                selected={checked || isPlanActive}
                onSelect={() => (isPlanActive ? undefined : toggle(module.key))}
              />
            );
          })}
        </div>

        {/* Payment */}
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, marginTop: 4 }}>Payer avec Mobile Money</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: -4 }} role="radiogroup" aria-label="Opérateur Mobile Money">
          <button
            type="button"
            role="radio"
            aria-checked={operator === 'mtn'}
            onClick={() => setOperator('mtn')}
            style={{ height: 50, borderRadius: 25, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FFFFFF', color: '#0A1B3D', border: operator === 'mtn' ? '2px solid #0A1B3D' : '1.5px solid #E1E6EF' }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#FFB400', display: 'inline-block' }} />
            MTN MoMo
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={operator === 'moov'}
            onClick={() => setOperator('moov')}
            style={{ height: 50, borderRadius: 25, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: operator === 'moov' ? '#FFFFFF' : '#EEF1F6', color: '#0A1B3D', border: operator === 'moov' ? '2px solid #0A1B3D' : '1.5px solid transparent' }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#0BAA4F', display: 'inline-block' }} />
            Moov Money
          </button>
        </div>

        <TextField
          type="tel"
          aria-label="Numéro Mobile Money"
          placeholder="01 XX XX XX XX"
          value={payPhone}
          onChange={(e) => setPayPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          prefix={<span style={{ height: 40, padding: '0 12px', borderRadius: 20, background: '#F1F4F9', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700 }}>+229</span>}
        />

        <Button
          variant="primary"
          size="md"
          fullWidth
          leftIcon={<ShieldCheck size={18} stroke="#FFB400" />}
          onClick={() => setCheckoutOpen(true)}
          disabled={cartItems.length === 0}
        >
          {ctaAmount > 0 ? `Payer ${formatPrice(ctaAmount)}` : 'Sélectionne une offre'}
        </Button>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#5B6680', marginTop: -4 }}>Paiement sécurisé par FedaPay · XOF</div>

        {/* Promo code */}
        <div style={{ marginTop: 18 }}>
          <div style={{ borderRadius: 26, background: '#FFFFFF', padding: 18, boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)' }}>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Vous avez un code promo ?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextField
                type="text"
                placeholder="CODE PROMO"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                style={{ flexGrow: 1 }}
                disabled={promoBusy}
              />
              <Button variant="outline" size="sm" onClick={() => void handleRedeemPromo()} disabled={promoBusy || !promoCode.trim()}>
                {promoBusy ? 'Vérification…' : 'Valider'}
              </Button>
            </div>
            {promoError && <p style={{ fontSize: 12.5, fontWeight: 600, color: '#C2410C', marginTop: 8 }}>{promoError}</p>}
            {promoSuccess && <p style={{ fontSize: 12.5, fontWeight: 600, color: '#067A37', marginTop: 8 }}>{promoSuccess}</p>}
          </div>
        </div>

        {/* MobileMoneyCheckout */}
        <MobileMoneyCheckout
          open={checkoutOpen}
          items={cartItems}
          modules={modules}
          defaultPhone={payPhone || user.phone}
          defaultOperator={operator}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(access) => {
            setMe(access);
            setSelected({});
            setCheckoutOpen(false);
          }}
        />

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="offres" />
    </div>
  );
}

export default AbonnementPage;