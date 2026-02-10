import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PackageCard from '@/components/onboarding/PackageCard';
import { buildDurationOptionsFromDb, computeDiscountedTotal, type PackageDurationRow } from '@/lib/packageDurations';

  type DbAddOn = {
    id: string; // package_add_ons.id
    addOnKey: string;
    label: string;
    pricePerUnit: number;
    unitStep: number;
    unit: string;
    maxQuantity?: number | null;
  };

type DbDuration = PackageDurationRow;

interface Package {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  features: string[];
}

// NOTE: Optional Add-ons are intentionally DB-driven.
// If the DB has no active add-ons for a package, we show none.

export default function SelectPackage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessStage, setBusinessStage] = useState<'new' | 'growing'>('new');
  const [dbAddOnsByPackageId, setDbAddOnsByPackageId] = useState<Record<string, DbAddOn[]>>({});
  const [dbDurationsByPackageId, setDbDurationsByPackageId] = useState<Record<string, DbDuration[]>>({});

  const [selectedDurationByPackageId, setSelectedDurationByPackageId] = useState<Record<string, number>>({});

  useEffect(() => {
    // Get the business stage from session storage (tetap disimpan untuk copy/label)
    const stage = (sessionStorage.getItem('onboarding_businessStage') as 'new' | 'growing') || 'new';
    setBusinessStage(stage);

    const fetchPackages = async () => {
      setIsLoading(true);
      try {
        // Tampilkan paket yang sama untuk semua stage: ambil semua packages aktif dari DB
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('is_active', true)
          .order('price');

        if (error) throw error;

        const mapped: Package[] = (data || []).map((pkg: any) => ({
          id: String(pkg.id),
          name: String(pkg.name),
          type: String(pkg.type),
          description: String(pkg.description ?? ''),
          price: Number(pkg.price ?? 0),
          features: Array.isArray(pkg.features) ? (pkg.features as string[]) : JSON.parse((pkg.features as string) || '[]'),
        }));

        setPackages(mapped);

        // Load DB add-ons
        const pkgIds = mapped.map((p) => String(p.id)).filter(Boolean);
        if (pkgIds.length > 0) {
          const { data: addOnRows } = await (supabase as any)
            .from('package_add_ons')
            .select('id,package_id,add_on_key,label,price_per_unit,unit_step,unit,sort_order,max_quantity')
            .in('package_id', pkgIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

          const grouped: Record<string, DbAddOn[]> = {};
          ((addOnRows as any[]) || []).forEach((r) => {
            const pid = String(r.package_id);
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push({
              id: String(r.id),
              addOnKey: String(r.add_on_key),
              label: String(r.label),
              pricePerUnit: Number(r.price_per_unit ?? 0),
              unitStep: Number(r.unit_step ?? 1),
              unit: String(r.unit ?? 'unit'),
              maxQuantity: r.max_quantity === null || r.max_quantity === undefined ? null : Number(r.max_quantity),
            });
          });
          setDbAddOnsByPackageId(grouped);

          // Load durations
          const { data: durationRows } = await (supabase as any)
            .from('package_durations')
            .select('id,package_id,duration_months,discount_percent,is_active,sort_order')
            .in('package_id', pkgIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('duration_months', { ascending: true });

          const groupedDurations: Record<string, DbDuration[]> = {};
          ((durationRows as any[]) || []).forEach((r) => {
            const pid = String(r.package_id);
            if (!groupedDurations[pid]) groupedDurations[pid] = [];
            groupedDurations[pid].push({
              id: String(r.id),
              package_id: pid,
              duration_months: Number(r.duration_months ?? 1),
              discount_percent: Number(r.discount_percent ?? 0),
              is_active: Boolean(r.is_active ?? true),
              sort_order: Number(r.sort_order ?? 0),
            });
          });
          setDbDurationsByPackageId(groupedDurations);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPackages();
  }, []);

  const handlePackageSelect = (pkgId: string, price: number, addOns: Record<string, number>) => {
    setSelectedPackage(pkgId);
    setTotalPrice(price);
    setSelectedAddOns(addOns);

    // If there are duration options beyond the implicit 1 month, the user must explicitly pick one.
    // Otherwise, default to 1 month.
    setSelectedDurationByPackageId((prev) => {
      if (prev[pkgId]) return prev;
      const opts = buildDurationOptionsFromDb(dbDurationsByPackageId[pkgId]);
      const visible = opts.filter((o) => o.months !== 1);
      if (visible.length === 0) return { ...prev, [pkgId]: 1 };
      return prev;
    });
  };

  const selectedDurationOptions = useMemo(() => {
    if (!selectedPackage) return [];
    return buildDurationOptionsFromDb(dbDurationsByPackageId[selectedPackage]);
  }, [dbDurationsByPackageId, selectedPackage]);

  const visibleSelectedDurationOptions = useMemo(
    () => selectedDurationOptions.filter((o) => o.months !== 1),
    [selectedDurationOptions]
  );

  const requiresDurationPick = visibleSelectedDurationOptions.length > 0;

  const selectedDurationMonths = selectedPackage
    ? (selectedDurationByPackageId[selectedPackage] ?? (requiresDurationPick ? null : 1))
    : null;

  const selectedDurationMeta = selectedPackage && selectedDurationMonths
    ? selectedDurationOptions.find((o) => o.months === selectedDurationMonths)
    : null;

  const totalWithDuration = useMemo(() => {
    if (!selectedPackage) return 0;
    const months = selectedDurationMonths ?? 1;
    const discount = selectedDurationMeta?.discountPercent ?? 0;
    return computeDiscountedTotal({ monthlyPrice: totalPrice, months, discountPercent: discount });
  }, [selectedDurationMeta?.discountPercent, selectedDurationMonths, selectedPackage, totalPrice]);

  const handleContinue = async () => {
    if (!user || !selectedPackage) return;
    const months = selectedDurationByPackageId[selectedPackage] ?? 1;

    setIsSubmitting(true);
    try {
      // Persist onboarding add-ons selections (per add-on id)
      const selectedEntries = Object.entries(selectedAddOns || {}).filter(([, qty]) => Number(qty) > 0);
      const selectedAddOnIds = selectedEntries.map(([addOnId]) => addOnId);

      if (selectedEntries.length > 0) {
        const { error: selUpsertErr } = await (supabase as any)
          .from('onboarding_add_on_selections')
          .upsert(
            selectedEntries.map(([addOnId, qty]) => ({
              user_id: user.id,
              add_on_id: addOnId,
              quantity: Number(qty) || 0,
            })),
            { onConflict: 'user_id,add_on_id' }
          );

        if (selUpsertErr) throw selUpsertErr;
      }

      // Remove any previous selections not currently chosen
      if (selectedAddOnIds.length > 0) {
        const { error: selDelErr } = await (supabase as any)
          .from('onboarding_add_on_selections')
          .delete()
          .eq('user_id', user.id)
          // PostgREST expects `in.(a,b,c)` style values; supabase-js wraps it as a string
          .not('add_on_id', 'in', `(${selectedAddOnIds.join(',')})`);

        if (selDelErr) throw selDelErr;
      } else {
        const { error: selClearErr } = await (supabase as any)
          .from('onboarding_add_on_selections')
          .delete()
          .eq('user_id', user.id);
        if (selClearErr) throw selClearErr;
      }

      // Create user package request (awaiting admin approval/payment)
      const { error: packageError } = await (supabase as any).from('user_packages').insert({
        user_id: user.id,
        package_id: selectedPackage,
        status: 'pending',
        duration_months: Number(months) || 1,
      });

      if (packageError) throw packageError;

      // Mark onboarding as completed
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);

      if (businessError) {
        console.error('Error updating business:', businessError);
        throw businessError;
      }

      // Clear session storage
      sessionStorage.removeItem('onboarding_firstName');
      sessionStorage.removeItem('onboarding_lastName');
      sessionStorage.removeItem('onboarding_businessStage');
      sessionStorage.removeItem('onboarding_businessName');
      sessionStorage.removeItem('onboarding_businessType');
      sessionStorage.removeItem('onboarding_country');
      sessionStorage.removeItem('onboarding_city');
      sessionStorage.removeItem('onboarding_phoneNumber');

      const packageName = packages.find((p) => p.id === selectedPackage)?.name;

      toast({
        title: 'Welcome aboard!',
        description: `Your ${packageName} package request is awaiting approval.`,
      });

      navigate('/dashboard/user');
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save package. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading packages...</div>
      </div>
    );
  }

  const displayPackages = packages;

  const getAddOns = (pkg: any) => {
    const pkgId = String(pkg?.id ?? '');
    const fromDb = pkgId && dbAddOnsByPackageId[pkgId];
    return fromDb && fromDb.length > 0 ? fromDb : [];
  };

  const getDurations = (pkg: any) => {
    const pkgId = String(pkg?.id ?? '');
    return buildDurationOptionsFromDb(pkgId ? dbDurationsByPackageId[pkgId] : []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate('/onboarding/online-presence')}
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="max-w-6xl mx-auto space-y-8 pt-8 animate-fade-in">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2">
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-primary" />
        </div>

        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-primary mb-2">STEP 4</div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Choose Your Package</h1>
          <p className="text-muted-foreground">
            {businessStage === 'new' 
              ? 'Select the plan that fits your new business needs'
              : 'Select the plan to grow your existing business'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              name={pkg.name}
              type={pkg.type as any}
              description={pkg.description}
              basePrice={pkg.price}
              features={pkg.features}
              addOns={getAddOns(pkg)}
              durationOptions={getDurations(pkg)}
              selectedDurationMonths={selectedDurationByPackageId[String(pkg.id)] ?? null}
              onDurationChange={(months) => {
                const pid = String(pkg.id);
                setSelectedDurationByPackageId((prev) => ({ ...prev, [pid]: months }));
              }}
              isPopular={businessStage === 'new' ? pkg.type === 'growth' : pkg.type === 'scale'}
              isSelected={selectedPackage === pkg.id}
              onSelect={(price, addOns) => handlePackageSelect(pkg.id, price, addOns)}
            />
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={isSubmitting || !selectedPackage || (requiresDurationPick && !selectedDurationMonths)}
            className="px-8"
          >
            {isSubmitting
              ? 'Setting up...'
              : selectedPackage
                ? (requiresDurationPick && !selectedDurationMonths)
                  ? 'Choose a duration to continue'
                  : `Continue with $${totalWithDuration} (${selectedDurationMeta?.label ?? '1 Month'})`
                : 'Select a package to continue'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
