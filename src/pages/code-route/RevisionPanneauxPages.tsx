import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageNavbar } from '../../components/PageNavbar';
import { Reveal } from '../../components/Reveal';
import { AppShell, userInitialsOf } from '../../components/layout/AppShell';
import { Button, Card, IconBadge, SectionTitle } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

const MOCK_CATEGORIES = [
  { id: '1', name: 'Panneaux de danger', panneauxCount: 12 },
  { id: '2', name: 'Panneaux d\'interdiction', panneauxCount: 8 },
  { id: '3', name: 'Panneaux d\'obligation', panneauxCount: 10 },
  { id: '4', name: 'Panneaux d\'indication', panneauxCount: 15 },
];

export function RevisionPanneauxPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; panneauxCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setCategories(MOCK_CATEGORIES);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading) return null;

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PageNavbar
          title="Panneaux"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16M15 4v16"/></svg>}
          onBack={() => navigate('/code-de-la-route')}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>Catégories</SectionTitle>
          {loading ? (
            <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Chargement…</p>
          ) : error ? (
            <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{error}</p>
          ) : categories.length === 0 ? (
            <Card style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: '#5B6680' }}>Aucune catégorie publiée.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {categories.map((category) => (
                <Reveal key={category.id} delay={100}>
                <Link
                  to={`/code-de-la-route/revision-panneaux/${category.id}`}
                  state={{ category }}
                  style={{ textDecoration: 'none' }}
                >
                  <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 20, background: '#EAF7EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#067A37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16M15 4v16"/></svg>
                    </div>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0A1B3D' }}>{category.name}</span>
                    <span style={{ fontSize: 12, color: '#5B6680', fontWeight: 600 }}>{category.panneauxCount} panneaux</span>
                  </Card>
                </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export function RevisionPanneauxCategoryPage() {
  const navigate = useNavigate();
  const { categoryId = '' } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const stateCategory = (location.state as { category?: { id: string; name: string } } | null)?.category;
  const [category, setCategory] = useState<{ id: string; name: string; panneaux: string[] } | null>(
    stateCategory ? { ...stateCategory, panneaux: [] } : null,
  );
  const [loading, setLoading] = useState(!stateCategory);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (stateCategory) {
      setCategory({ ...stateCategory, panneaux: [] });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setCategory({ id: categoryId, name: 'Panneaux de danger', panneaux: ['A1', 'A2', 'A3'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [categoryId, stateCategory]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading) return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EAEFF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#5B6680' }}>Chargement…</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EAEFF6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px' }}>
        <div style={{ borderRadius: 26, background: '#FFFFFF', padding: '24px', boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)', textAlign: 'center' }}>
          <p style={{ color: '#5B6680' }}>Catégorie introuvable.</p>
          <Button variant="outline" onClick={() => navigate('/code-de-la-route/revision-panneaux')} style={{ marginTop: 16 }}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PageNavbar
          title="Panneaux"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16M15 4v16"/></svg>}
          onBack={() => navigate('/code-de-la-route/revision-panneaux')}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconBadge icon={<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16M15 4v16"/></svg>} tone="green" />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: '#5B6680', fontWeight: 600 }}>Panneaux</p>
              <h1 style={{ margin: '4px 0 0', fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>{category.name}</h1>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Chargement…</p>
          ) : error ? (
            <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{error}</p>
          ) : category.panneaux.length === 0 ? (
            <Card style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: '#5B6680' }}>Aucun panneau publié pour cette catégorie.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {category.panneaux.map((panneau, index) => (
                <Reveal key={panneau} delay={index * 30}>
                <Card style={{ aspectRatio: '1', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px', background: '#EAEFF6' }}>
                  <div style={{ width: 80, height: 80, borderRadius: 20, background: '#EAF7EF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#067A37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16M15 4v16"/></svg>
                  </div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0A1B3D' }}>Panneau {index + 1}</p>
                </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default RevisionPanneauxPage;