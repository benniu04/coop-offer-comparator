import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  calculateOffer,
  LOCATIONS,
  stateHasIncomeTax,
  TAX_YEAR,
  type OfferResult,
} from "@coop/tax";

/** Where shared links point; set EXPO_PUBLIC_WEB_URL to the deployed web app. */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://coop-comparator.vercel.app";

const COLORS = {
  paper: "#eef3ef",
  card: "#ffffff",
  ink: "#16302b",
  inkSoft: "#5c7a6e",
  money: "#0b8a5c",
  moneySoft: "#e3f3ec",
  mark: "#ffe45c",
  rule: "#d9e5dd",
  rent: "#b0532f",
};

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

type Stage = "welcome" | "offer-a" | "offer-b" | "results";

interface OfferFormState {
  rate: string;
  hours: string;
  months: string;
  city: string;
  rent: string;
  home: boolean;
}

const EMPTY_A: OfferFormState = { rate: "", hours: "", months: "", city: "boston", rent: "", home: false };
const EMPTY_B: OfferFormState = { ...EMPTY_A, city: "nyc" };
const EXAMPLE_A: OfferFormState = { rate: "40", hours: "40", months: "6", city: "boston", rent: "1600", home: false };
const EXAMPLE_B: OfferFormState = { rate: "45", hours: "40", months: "6", city: "nyc", rent: "2200", home: false };

const parse = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isOfferComplete = (form: OfferFormState) =>
  [form.rate, form.hours, form.months].every((value) => parse(value) > 0);

function calculate(form: OfferFormState): OfferResult {
  return calculateOffer({
    hourlyRate: parse(form.rate),
    hoursPerWeek: parse(form.hours),
    durationMonths: parse(form.months),
    locationId: form.city,
    monthlyRent: form.home ? 0 : parse(form.rent),
  });
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmt(amount: number): string {
  const rounded = Math.round(amount);
  return currency.format(rounded === 0 ? 0 : rounded);
}

/** Same query-param scheme as the web app, so shared links open the same comparison. */
function shareQuery(a: OfferFormState, b: OfferFormState): string {
  const encode = (prefix: string, o: OfferFormState) =>
    `${prefix}r=${o.rate}&${prefix}h=${o.hours}&${prefix}m=${o.months}&${prefix}c=${o.city}&${prefix}rent=${o.rent}` +
    (o.home ? `&${prefix}home=1` : "");
  return `${encode("a", a)}&${encode("b", b)}`;
}

/** Fade-up entrance used to stage the results reveal. */
function Reveal({
  delay = 0,
  skip = false,
  children,
}: {
  delay?: number;
  skip?: boolean;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(skip ? 0 : 12)).current;

  useEffect(() => {
    if (skip) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, disabled && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          editable={!disabled}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#a8bdb0"
          onChangeText={(text) => {
            if (/^[0-9]*\.?[0-9]*$/.test(text)) onChange(text);
          }}
        />
        <Text style={styles.inputSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function CityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = LOCATIONS.find((l) => l.id === value);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>City</Text>
      <Pressable
        style={styles.inputWrap}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`City: ${selected?.label}. Tap to change.`}
      >
        <Text style={styles.cityValue} numberOfLines={1}>
          {selected?.label}
        </Text>
        <Text style={styles.inputSuffix}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Where&rsquo;s the offer?</Text>
            {LOCATIONS.map((location) => (
              <Pressable
                key={location.id}
                style={[styles.modalOption, location.id === value && styles.modalOptionActive]}
                onPress={() => {
                  onChange(location.id);
                  setOpen(false);
                }}
              >
                <Text
                  style={[styles.modalOptionText, location.id === value && styles.modalOptionTextActive]}
                >
                  {location.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** The shared input grid — used by the guided steps and the editable results cards. */
function OfferFields({
  form,
  onChange,
}: {
  form: OfferFormState;
  onChange: (form: OfferFormState) => void;
}) {
  const set = (patch: Partial<OfferFormState>) => onChange({ ...form, ...patch });
  return (
    <View style={styles.fieldGrid}>
      <Field label="Pay" suffix="$/hr" placeholder="40" value={form.rate} onChange={(rate) => set({ rate })} />
      <Field label="Hours" suffix="hrs/wk" placeholder="40" value={form.hours} onChange={(hours) => set({ hours })} />
      <Field label="Length" suffix="months" placeholder="6" value={form.months} onChange={(months) => set({ months })} />
      <CityPicker value={form.city} onChange={(city) => set({ city })} />
      <Field
        label="Rent"
        suffix="$/mo"
        placeholder="1600"
        value={form.home ? "0" : form.rent}
        onChange={(rent) => set({ rent })}
        disabled={form.home}
      />
      <View style={[styles.field, styles.homeToggle]}>
        <Switch
          value={form.home}
          onValueChange={(home) => set({ home })}
          trackColor={{ true: COLORS.money }}
        />
        <Text style={styles.homeToggleLabel}>Living at home / free housing</Text>
      </View>
    </View>
  );
}

const BEATS = [
  { title: "What actually hits your bank", detail: "Withholding-based take-home, month by month." },
  { title: "What rent really leaves you", detail: "The number that decides how the co-op feels." },
  {
    title: "The refund you're owed next April",
    detail: "Payroll taxes you like a full-year salary. You aren't one.",
  },
];

function WelcomeScreen({ onStart, onExample }: { onStart: () => void; onExample: () => void }) {
  return (
    <View style={styles.welcomeWrap}>
      <Text style={styles.eyebrow}>CO-OP COMPARATOR</Text>
      <Text style={styles.heroTitle}>Two offers.{"\n"}One answer.</Text>
      <Text style={styles.heroBody}>
        A higher hourly rate doesn&rsquo;t mean more money in your pocket. Enter both offers and
        see what actually lands in your bank — after taxes, rent, and the refund payroll never
        tells you about.
      </Text>

      <View style={styles.beats}>
        {BEATS.map((beat, i) => (
          <View key={beat.title} style={[styles.beat, i > 0 && styles.beatBorder]}>
            <Text style={styles.beatMarker}>{"$".repeat(i + 1)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.beatTitle}>{beat.title}</Text>
              <Text style={styles.beatDetail}>{beat.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.ctaPrimary} onPress={onStart} accessibilityRole="button">
        <Text style={styles.ctaPrimaryText}>Compare my offers</Text>
      </Pressable>
      <Pressable style={styles.ctaSecondary} onPress={onExample} accessibilityRole="button">
        <Text style={styles.ctaSecondaryText}>Show me an example first</Text>
      </Pressable>
      <Text style={styles.welcomeFootnote}>Takes about 30 seconds. No account, nothing saved.</Text>
    </View>
  );
}

function OfferStepScreen({
  label,
  form,
  onChange,
  onBack,
  onContinue,
  continueLabel,
}: {
  label: "A" | "B";
  form: OfferFormState;
  onChange: (form: OfferFormState) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const complete = isOfferComplete(form);
  return (
    <View>
      <Text style={styles.eyebrow}>STEP {label === "A" ? "1" : "2"} OF 2</Text>
      <Text style={styles.stepTitle}>Offer {label}</Text>
      <Text style={styles.stepSubtitle}>
        {label === "A" ? "Where's the first offer?" : "Now the other one."}
      </Text>

      <View style={styles.stepCard}>
        <OfferFields form={form} onChange={onChange} />
      </View>

      <View style={styles.stepActions}>
        <Pressable style={styles.backButton} onPress={onBack} accessibilityRole="button">
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Pressable
          style={[styles.ctaPrimary, styles.stepContinue, !complete && styles.ctaDisabled]}
          onPress={onContinue}
          disabled={!complete}
          accessibilityRole="button"
        >
          <Text style={styles.ctaPrimaryText}>{continueLabel}</Text>
        </Pressable>
      </View>
      {!complete && (
        <Text style={styles.stepHint}>Enter pay, hours, and length to continue.</Text>
      )}
    </View>
  );
}

function LedgerRow({
  label,
  amount,
  negative = false,
  bold = false,
  accent = false,
}: {
  label: string;
  amount: number;
  negative?: boolean;
  bold?: boolean;
  accent?: boolean;
}) {
  const color = accent ? COLORS.money : negative ? COLORS.inkSoft : COLORS.ink;
  return (
    <View style={styles.ledgerRow}>
      <Text style={[styles.ledgerLabel, bold && styles.ledgerBold, { color }]}>{label}</Text>
      <Text style={[styles.ledgerAmount, bold && styles.ledgerBold, { color }]}>
        {negative && amount > 0 ? `−${fmt(amount)}` : fmt(amount)}
      </Text>
    </View>
  );
}

function OfferCard({
  label,
  form,
  onChange,
  result,
  isWinner,
  reduceMotion,
}: {
  label: "A" | "B";
  form: OfferFormState;
  onChange: (form: OfferFormState) => void;
  result: OfferResult;
  isWinner: boolean;
  reduceMotion: boolean;
}) {
  const { monthlyWithholding: w, location } = result;
  const noStateTax = !stateHasIncomeTax(location.state);
  const months = parse(form.months);
  const hasRefund = result.estimatedRefund >= 1;

  return (
    <View style={[styles.card, isWinner && styles.cardWinner]}>
      {isWinner && (
        <View style={styles.winnerTag}>
          <Text style={styles.winnerTagText}>LEAVES YOU MORE</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Offer {label}</Text>
        <Text style={styles.cardCity}>{location.label}</Text>
      </View>

      <OfferFields form={form} onChange={onChange} />

      <Text style={styles.sectionLabel}>MONTHLY PAYCHECK</Text>
      <LedgerRow label="Gross pay" amount={result.monthlyGross} />
      <LedgerRow label="Federal tax" amount={w.federal} negative />
      {noStateTax ? (
        <LedgerRow label={`${location.state} state tax — none!`} amount={0} accent />
      ) : (
        <LedgerRow label={`${location.state} state tax`} amount={w.state} negative />
      )}
      {location.cityTax && <LedgerRow label="NYC city tax" amount={w.city} negative />}
      <LedgerRow label="FICA (Soc. Sec. + Medicare)" amount={w.fica} negative />
      <LedgerRow label="Take-home (hits your bank)" amount={result.monthlyTakeHome} bold />
      <LedgerRow
        label={form.home ? "Rent — covered" : "Rent"}
        amount={form.home ? 0 : result.monthlyTakeHome - result.monthlyAfterRent}
        negative={!form.home}
      />

      <View style={styles.leftoverBox}>
        <Text style={styles.leftoverLabel}>Left over each month</Text>
        <Text style={[styles.leftoverAmount, result.monthlyAfterRent < 0 && { color: COLORS.rent }]}>
          {fmt(result.monthlyAfterRent)}
        </Text>
        <View style={styles.leftoverDivider} />
        <Text style={styles.leftoverTotal}>
          Total kept over {months || "—"} month{months === 1 ? "" : "s"}:{" "}
          <Text style={styles.leftoverTotalAmount}>{fmt(result.totalNet)}</Text>
        </Text>
      </View>

      <View style={styles.perforation} />

      {hasRefund ? (
        <Reveal delay={600} skip={reduceMotion}>
          <View style={styles.refundBox}>
            <Text style={styles.refundHeadline}>
              + {fmt(result.estimatedRefund)} back as a refund next April
            </Text>
            <Text style={styles.refundBody}>
              Payroll withholds as if you&rsquo;d earn {fmt(result.monthlyGross * 12)} all year.
              You won&rsquo;t — so you&rsquo;re overpaying taxes now and get the difference back
              when you file. It&rsquo;s already counted in the total above.
            </Text>
          </View>
        </Reveal>
      ) : (
        <Text style={styles.emptyNote}>
          {result.totalGross > 0
            ? "Withholding matches what you'd owe — no refund expected."
            : "Enter pay and hours to see this offer's numbers."}
        </Text>
      )}
    </View>
  );
}

export default function App() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [a, setA] = useState(EMPTY_A);
  const [b, setB] = useState(EMPTY_B);
  // Bumped on every entry into results so the reveal re-runs.
  const [revealKey, setRevealKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => setReduceMotion(!!enabled));
  }, []);

  const resultA = useMemo(() => calculate(a), [a]);
  const resultB = useMemo(() => calculate(b), [b]);

  const bothLive = resultA.totalGross > 0 && resultB.totalGross > 0;
  const difference = resultA.totalNet - resultB.totalNet;
  const winner: "a" | "b" | null =
    bothLive && Math.abs(difference) >= 1 ? (difference > 0 ? "a" : "b") : null;
  const winnerResult = winner === "a" ? resultA : winner === "b" ? resultB : null;

  function goToResults() {
    setRevealKey((k) => k + 1);
    setStage("results");
  }

  function showExample() {
    setA(EXAMPLE_A);
    setB(EXAMPLE_B);
    goToResults();
  }

  function startOver() {
    setA(EMPTY_A);
    setB(EMPTY_B);
    setStage("welcome");
  }

  async function share() {
    const blurb =
      winner && winnerResult
        ? `Offer ${winner.toUpperCase()} · ${winnerResult.location.label} leaves you ${fmt(
            Math.abs(difference)
          )} more over the co-op.`
        : "Compare two co-op offers and see which one actually leaves you with more money.";
    await Share.share({
      message: `${blurb} See the math: ${WEB_URL}/?${shareQuery(a, b)}`,
    });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {stage === "welcome" && (
          <WelcomeScreen onStart={() => setStage("offer-a")} onExample={showExample} />
        )}

        {(stage === "offer-a" || stage === "offer-b") &&
          (stage === "offer-a" ? (
            <OfferStepScreen
              label="A"
              form={a}
              onChange={setA}
              onBack={() => setStage("welcome")}
              onContinue={() => setStage("offer-b")}
              continueLabel="Next: Offer B"
            />
          ) : (
            <OfferStepScreen
              label="B"
              form={b}
              onChange={setB}
              onBack={() => setStage("offer-a")}
              onContinue={goToResults}
              continueLabel="See which offer wins"
            />
          ))}

        {stage === "results" && (
          <View key={revealKey}>
            <Reveal skip={reduceMotion}>
              <Text style={styles.eyebrow}>TWO OFFERS, ONE ANSWER</Text>
              <Text style={styles.title}>Co-op Comparator</Text>
            </Reveal>

            <Reveal delay={100} skip={reduceMotion}>
              <View style={styles.verdict}>
                <Text style={styles.verdictText}>
                  {winner && winnerResult ? (
                    <>
                      <Text style={styles.verdictBold}>
                        Offer {winner.toUpperCase()} · {winnerResult.location.label}
                      </Text>{" "}
                      leaves you{" "}
                      <Text style={styles.verdictMoney}>{fmt(Math.abs(difference))}</Text> more
                      over the co-op.
                    </>
                  ) : bothLive ? (
                    "These offers come out even — pick the city you'd rather live in."
                  ) : (
                    "Fill in both offers to see which one wins."
                  )}
                </Text>
                <Pressable style={styles.shareButton} onPress={share} accessibilityRole="button">
                  <Text style={styles.shareButtonText}>Share this comparison</Text>
                </Pressable>
              </View>
            </Reveal>

            <Reveal delay={200} skip={reduceMotion}>
              <OfferCard
                label="A"
                form={a}
                onChange={setA}
                result={resultA}
                isWinner={winner === "a"}
                reduceMotion={reduceMotion}
              />
            </Reveal>
            <Reveal delay={320} skip={reduceMotion}>
              <OfferCard
                label="B"
                form={b}
                onChange={setB}
                result={resultB}
                isWinner={winner === "b"}
                reduceMotion={reduceMotion}
              />
            </Reveal>

            <Reveal delay={450} skip={reduceMotion}>
              <Pressable style={styles.startOver} onPress={startOver} accessibilityRole="button">
                <Text style={styles.startOverText}>Start over with different offers</Text>
              </Pressable>
            </Reveal>
          </View>
        )}

        <Text style={styles.footer}>
          Estimates only. Not tax advice. Single filer, {TAX_YEAR} rates.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },
  scroll: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 32 },
  eyebrow: {
    color: COLORS.money,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: { color: COLORS.ink, fontSize: 30, fontWeight: "700", marginBottom: 16 },

  welcomeWrap: { paddingTop: 24 },
  heroTitle: { color: COLORS.ink, fontSize: 40, fontWeight: "800", lineHeight: 46 },
  heroBody: { color: COLORS.inkSoft, fontSize: 15, lineHeight: 22, marginTop: 12 },
  beats: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.rule,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  beat: { alignItems: "flex-start", flexDirection: "row", gap: 10, padding: 12 },
  beatBorder: { borderTopColor: COLORS.rule, borderTopWidth: StyleSheet.hairlineWidth },
  beatMarker: { color: COLORS.money, fontFamily: MONO, fontSize: 12, fontWeight: "700", marginTop: 2, width: 30 },
  beatTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "700" },
  beatDetail: { color: COLORS.inkSoft, fontSize: 12, marginTop: 1 },
  ctaPrimary: {
    alignItems: "center",
    backgroundColor: COLORS.money,
    borderRadius: 14,
    marginTop: 20,
    paddingVertical: 14,
  },
  ctaPrimaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  ctaDisabled: { opacity: 0.4 },
  ctaSecondary: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.rule,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 12,
  },
  ctaSecondaryText: { color: COLORS.inkSoft, fontSize: 14, fontWeight: "700" },
  welcomeFootnote: { color: COLORS.inkSoft, fontSize: 11, marginTop: 14, textAlign: "center" },

  stepTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "800" },
  stepSubtitle: { color: COLORS.inkSoft, fontSize: 14, marginTop: 2 },
  stepCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.rule,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  stepActions: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 16 },
  backButton: { paddingHorizontal: 8, paddingVertical: 12 },
  backButtonText: { color: COLORS.inkSoft, fontSize: 14, fontWeight: "700" },
  stepContinue: { flex: 1, marginTop: 0 },
  stepHint: { color: COLORS.inkSoft, fontSize: 11, marginTop: 8, textAlign: "right" },

  verdict: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.rule,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  verdictText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 },
  verdictBold: { fontWeight: "700" },
  verdictMoney: { color: COLORS.money, fontFamily: MONO, fontWeight: "700" },
  shareButton: {
    alignItems: "center",
    backgroundColor: COLORS.paper,
    borderColor: COLORS.rule,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 8,
  },
  shareButtonText: { color: COLORS.ink, fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.rule,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  cardWinner: { borderColor: COLORS.money },
  winnerTag: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.mark,
    borderRadius: 3,
    marginTop: -26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: "2deg" }],
  },
  winnerTagText: { color: COLORS.ink, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  cardHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "700" },
  cardCity: { color: COLORS.inkSoft, fontSize: 12 },

  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  field: { flexBasis: "47%", flexGrow: 1 },
  fieldLabel: { color: COLORS.inkSoft, fontSize: 11, fontWeight: "700", marginBottom: 4 },
  inputWrap: {
    alignItems: "center",
    backgroundColor: COLORS.paper,
    borderColor: COLORS.rule,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  inputDisabled: { opacity: 0.4 },
  input: { color: COLORS.ink, flex: 1, fontFamily: MONO, fontSize: 14, paddingVertical: 8 },
  inputSuffix: { color: COLORS.inkSoft, fontSize: 11, marginLeft: 6 },
  cityValue: { color: COLORS.ink, flex: 1, fontSize: 13, paddingVertical: 10 },
  homeToggle: { alignItems: "center", flexDirection: "row", gap: 8, paddingTop: 14 },
  homeToggleLabel: { color: COLORS.inkSoft, flex: 1, fontSize: 11, fontWeight: "600" },

  modalBackdrop: {
    backgroundColor: "rgba(22, 48, 43, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: { backgroundColor: COLORS.card, borderRadius: 16, padding: 12 },
  modalTitle: {
    color: COLORS.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  modalOption: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  modalOptionActive: { backgroundColor: COLORS.moneySoft },
  modalOptionText: { color: COLORS.ink, fontSize: 15 },
  modalOptionTextActive: { color: COLORS.money, fontWeight: "700" },

  sectionLabel: {
    color: COLORS.inkSoft,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ledgerRow: {
    alignItems: "baseline",
    borderBottomColor: COLORS.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  ledgerLabel: { flex: 1, fontSize: 12 },
  ledgerAmount: { fontFamily: MONO, fontSize: 12 },
  ledgerBold: { fontSize: 13, fontWeight: "700" },

  leftoverBox: { backgroundColor: COLORS.paper, borderRadius: 12, marginTop: 14, padding: 14 },
  leftoverLabel: { color: COLORS.inkSoft, fontSize: 11, fontWeight: "700" },
  leftoverAmount: { color: COLORS.ink, fontFamily: MONO, fontSize: 30, fontWeight: "700", marginTop: 2 },
  leftoverDivider: { backgroundColor: COLORS.rule, height: StyleSheet.hairlineWidth, marginVertical: 8 },
  leftoverTotal: { color: COLORS.inkSoft, fontSize: 11 },
  leftoverTotalAmount: { color: COLORS.ink, fontFamily: MONO, fontWeight: "700" },

  perforation: {
    borderColor: COLORS.rule,
    borderStyle: "dashed",
    borderTopWidth: 2,
    marginTop: 14,
  },
  refundBox: { backgroundColor: COLORS.moneySoft, borderRadius: 12, marginTop: 12, padding: 14 },
  refundHeadline: { color: COLORS.money, fontSize: 14, fontWeight: "700" },
  refundBody: { color: COLORS.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 4 },
  emptyNote: { color: COLORS.inkSoft, fontSize: 11, marginTop: 12, paddingHorizontal: 2 },

  startOver: { alignItems: "center", marginBottom: 8, paddingVertical: 8 },
  startOverText: { color: COLORS.inkSoft, fontSize: 12, fontWeight: "700" },

  footer: { color: COLORS.inkSoft, fontSize: 11, marginTop: 4, textAlign: "center" },
});
