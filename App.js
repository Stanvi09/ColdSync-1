import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Modal, TextInput, StatusBar,
  Clipboard, Share, Dimensions, Animated, Platform
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- FIREBASE CONFIG ---
import { ref, onValue, push, set } from 'firebase/database';
import { db, auth } from './firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

// ─── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  bg:        '#06080F',
  surface:   '#0D1321',
  card:      '#111827',
  border:    '#1C2840',
  borderHi:  '#243352',
  accent:    '#00F5A0',
  accentDim: '#00F5A018',
  blue:      '#3D8EFF',
  blueDim:   '#3D8EFF18',
  red:       '#FF4560',
  redDim:    '#FF456018',
  amber:     '#FFB443',
  amberDim:  '#FFB44318',
  textPri:   '#EDF2FF',
  textSec:   '#6B7FA8',
  textMute:  '#2F3F5E',
};

// ─── POWER RING ─────────────────────────────────────────────────
const PowerRing = ({ percentage, color }) => (
  <View style={ring.wrap}>
    <View style={[ring.fill, { height: `${percentage}%`, backgroundColor: color, top: `${100 - percentage}%` }]} />
    <Text style={ring.text}>{percentage}%</Text>
  </View>
);
const ring = StyleSheet.create({
  wrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.bg, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: C.border },
  fill: { width: '100%', position: 'absolute', opacity: 0.85 },
  text: { color: C.textPri, fontWeight: '800', fontSize: 13, width: '100%', textAlign: 'center', marginBottom: 24, zIndex: 2 },
});

// ─── PILL BADGE ─────────────────────────────────────────────────
const Pill = ({ label, color = C.accent, dimColor, icon }) => (
  <View style={[pill.wrap, { backgroundColor: dimColor || color + '18', borderColor: color + '40' }]}>
    {icon && <MaterialCommunityIcons name={icon} size={10} color={color} style={{ marginRight: 4 }} />}
    <Text style={[pill.text, { color }]}>{label}</Text>
  </View>
);
const pill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
});

// ─── SECTION HEADER ─────────────────────────────────────────────
const SectionHeader = ({ label }) => (
  <View style={sh.row}>
    <View style={sh.line} />
    <Text style={sh.text}>{label}</Text>
    <View style={sh.lineRight} />
  </View>
);
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 16 },
  line: { width: 20, height: 1, backgroundColor: C.border, marginRight: 10 },
  lineRight: { flex: 1, height: 1, backgroundColor: C.border, marginLeft: 10 },
  text: { color: C.textMute, fontSize: 9, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase' },
});

// ─── SIMPLE BAR CHART ───────────────────────────────────────────
const SimpleBarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 14 }}>
      {data.map((item, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: C.textSec, fontSize: 11, fontWeight: '600', flex: 1 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 11, fontWeight: '800', marginLeft: 8 }}>{item.display}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color, borderRadius: 4 }} />
          </View>
          {item.note ? <Text style={{ color: C.textMute, fontSize: 9, marginTop: 4 }}>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  // role: null = not chosen yet, 'dispatcher' = sending, 'receiver' = tracking
  const [role, setRole]         = useState(null);
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [trackId, setTrackId]   = useState('');
  // dispatcher signup fields
  const [destination, setDestination] = useState('');
  const [eta, setEta]                 = useState('');
  const [contents, setContents]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Generate a random tracking ID for dispatchers
  const generateTrackingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `CS-${rand(4)}-${rand(3)}`;
  };

  const handleSubmit = () => {
    setError('');
    if (mode === 'signup') {
      if (!name.trim())         return setError('Please enter your full name.');
      if (!email.includes('@')) return setError('Enter a valid email address.');
      if (password.length < 6)  return setError('Password must be at least 6 characters.');
      if (role === 'receiver' && !trackId.trim()) return setError('Please enter the tracking ID shared by the sender.');
      if (role === 'dispatcher') {
        if (!destination.trim()) return setError('Please enter the destination.');
        if (!eta.trim())         return setError('Please enter the estimated arrival.');
      }
    } else {
      if (!email.includes('@')) return setError('Enter a valid email address.');
      if (!password.trim())     return setError('Please enter your password.');
      if (!trackId.trim())      return setError('Please enter your Tracking ID.');
    }

    setLoading(true);

    const doAuth = async () => {
      try {
        let firebaseUser;
        let cleanId;

        if (mode === 'signup') {
          // --- SIGN UP ---
          try {
            firebaseUser = await createUserWithEmailAndPassword(auth, email.trim(), password);
          } catch (e) {
            setLoading(false);
            if (e.code === 'auth/email-already-in-use') {
              // Already registered — just switch to sign in for them
              setMode('login');
              setError('Looks like you already have an account. We have switched to sign in — just enter your password.');
            } else if (e.code === 'auth/invalid-email') {
              setError('Invalid email address.');
            } else {
              setError('Sign up failed: ' + e.message);
            }
            return;
          }

          if (role === 'dispatcher') {
            // Generate tracking ID and create shipment node
            cleanId = generateTrackingId();
            const shipmentRef = ref(db, `shipments/${cleanId}`);
            await set(shipmentRef, {
              destination: destination.trim(),
              eta: eta.trim(),
              contents: contents.trim() || 'Not specified',
              status: 'IN-TRANSIT',
              dispatchedBy: name.trim(),
              createdAt: new Date().toISOString(),
            });
          } else {
            // Receiver: validate the tracking ID actually exists in Firebase
            cleanId = trackId.toUpperCase();
            const shipmentRef = ref(db, `shipments/${cleanId}`);
            const exists = await new Promise((resolve) => {
              onValue(shipmentRef, (snap) => resolve(snap.exists()), { onlyOnce: true });
            });
            if (!exists) {
              setError('Tracking ID not found. Ask the sender to double-check.');
              setLoading(false);
              return;
            }
          }

          // Save user profile (name, role, trackingId) to Firebase under their uid
          await set(ref(db, `users/${firebaseUser.user.uid}`), {
            name: name.trim(),
            email: email.trim(),
            role,
            trackingId: cleanId,
          });

          setLoading(false);
          onAuth({ name: name.trim(), trackingId: cleanId, role, isNew: true });

        } else {
          // --- SIGN IN ---
          try {
            firebaseUser = await signInWithEmailAndPassword(auth, email.trim(), password);
          } catch (e) {
            setLoading(false);
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
              // No account — switch to signup for them
              setMode('signup');
              setError('No account found with this email. We have switched to sign up — fill in your details to get started.');
            } else if (e.code === 'auth/wrong-password') {
              setError('Wrong password. Please try again.');
            } else if (e.code === 'auth/too-many-requests') {
              setError('Too many attempts. Please wait a moment and try again.');
            } else {
              setError('Sign in failed: ' + e.message);
            }
            return;
          }

          // Read saved profile from Firebase to restore name, role, trackingId
          const profileRef = ref(db, `users/${firebaseUser.user.uid}`);
          onValue(profileRef, (snap) => {
            const profile = snap.val();
            if (profile) {
              setLoading(false);
              onAuth({
                name: profile.name,
                trackingId: profile.trackingId || trackId.toUpperCase(),
                role: profile.role || 'dispatcher',
                isNew: false,
              });
            } else {
              // Fallback if no profile saved (legacy accounts)
              setLoading(false);
              onAuth({
                name: email.split('@')[0],
                trackingId: trackId.toUpperCase(),
                role: 'dispatcher',
                isNew: false,
              });
            }
          }, { onlyOnce: true });
        }
      } catch (e) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    };

    doAuth();
  };

  // ── Role picker (shown before login/signup form) ─────────────────
  if (!role) {
    return (
      <ScrollView contentContainerStyle={authS.screen} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="light-content" />
        <Animated.View style={[authS.logoBlock, { opacity: fadeAnim }]}>
          <View style={authS.logoRing}>
            <MaterialCommunityIcons name="snowflake" size={28} color={C.accent} />
          </View>
          <Text style={authS.logoText}>ColdSync</Text>
          <Text style={authS.logoSub}>RVCE INNOVATION LAB</Text>
        </Animated.View>

        <View style={authS.card}>
          <Text style={authS.heading}>What brings you here?</Text>
          <Text style={[authS.sub, { marginBottom: 24 }]}>Choose your role to get started.</Text>

          <TouchableOpacity style={authS.roleCard} onPress={() => setRole('dispatcher')} activeOpacity={0.8}>
            <View style={[authS.roleIcon, { backgroundColor: C.accentDim, borderColor: C.accent + '40' }]}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={28} color={C.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={authS.roleTitle}>I'm sending a shipment</Text>
              <Text style={authS.roleSub}>Create a shipment, attach hardware, share tracking ID with receiver</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMute} />
          </TouchableOpacity>

          <TouchableOpacity style={[authS.roleCard, { marginTop: 12 }]} onPress={() => setRole('receiver')} activeOpacity={0.8}>
            <View style={[authS.roleIcon, { backgroundColor: C.blueDim, borderColor: C.blue + '40' }]}>
              <MaterialCommunityIcons name="package-variant" size={28} color={C.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={authS.roleTitle}>I'm receiving a shipment</Text>
              <Text style={authS.roleSub}>Track a live shipment using the ID shared by the sender</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMute} />
          </TouchableOpacity>

          <TouchableOpacity style={[authS.roleCard, { marginTop: 12 }]} onPress={() => { setRole('dispatcher'); setMode('login'); }} activeOpacity={0.8}>
            <View style={[authS.roleIcon, { backgroundColor: C.textMute + '18', borderColor: C.textMute + '30' }]}>
              <MaterialCommunityIcons name="login" size={28} color={C.textSec} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={authS.roleTitle}>Sign in to existing account</Text>
              <Text style={authS.roleSub}>Already registered? Sign in with your email and tracking ID</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMute} />
          </TouchableOpacity>
        </View>
        <Text style={authS.footer}>Authorized Personnel Only · RVCE Innovation Lab</Text>
      </ScrollView>
    );
  }

  // ── Login / Signup form ──────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={authS.screen} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" />

      <Animated.View style={[authS.logoBlock, { opacity: fadeAnim }]}>
        <View style={authS.logoRing}>
          <MaterialCommunityIcons name="snowflake" size={28} color={C.accent} />
        </View>
        <Text style={authS.logoText}>ColdSync</Text>
        <Text style={authS.logoSub}>RVCE INNOVATION LAB</Text>
      </Animated.View>

      <Animated.View style={[authS.card, { opacity: fadeAnim }]}>
        {/* Back + role indicator */}
        <TouchableOpacity onPress={() => { setRole(null); setError(''); }} style={authS.backRow}>
          <MaterialCommunityIcons name="arrow-left" size={16} color={C.textSec} />
          <Text style={authS.backText}>Back</Text>
          <View style={[authS.rolePill, { backgroundColor: role === 'dispatcher' ? C.accentDim : C.blueDim, borderColor: role === 'dispatcher' ? C.accent + '40' : C.blue + '40' }]}>
            <MaterialCommunityIcons name={role === 'dispatcher' ? 'truck-delivery-outline' : 'package-variant'} size={10} color={role === 'dispatcher' ? C.accent : C.blue} />
            <Text style={[authS.rolePillText, { color: role === 'dispatcher' ? C.accent : C.blue }]}>{role === 'dispatcher' ? 'DISPATCHER' : 'RECEIVER'}</Text>
          </View>
        </TouchableOpacity>

        {/* Sign in / Sign up tabs — only show if not forced to login */}
        <View style={authS.tabRow}>
          {['login','signup'].map(m => (
            <TouchableOpacity key={m} style={[authS.tab, mode === m && authS.tabActive]} onPress={() => { setMode(m); setError(''); }}>
              <Text style={[authS.tabText, mode === m && authS.tabTextActive]}>{m === 'login' ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={authS.heading}>
          {mode === 'login' ? 'Welcome back' : role === 'dispatcher' ? 'New shipment' : 'Track a shipment'}
        </Text>
        <Text style={authS.sub}>
          {mode === 'login'
            ? 'Sign in to your ColdSync account.'
            : role === 'dispatcher'
            ? 'Create your account and set up this shipment.'
            : 'Create your account to start tracking.'}
        </Text>

        {mode === 'signup' && (
          <Field icon="account-outline" label="FULL NAME" placeholder="Dr. Tanvi Sharma" value={name} onChangeText={setName} autoCapitalize="words" />
        )}
        <Field icon="email-outline" label="EMAIL" placeholder="operator@coldsync.in" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field icon="lock-outline" label="PASSWORD" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPass} rightIcon={showPass ? 'eye-off-outline' : 'eye-outline'} onRightIcon={() => setShowPass(p => !p)} />

        {/* Dispatcher signup: shipment details — tracking ID is auto-generated */}
        {mode === 'signup' && role === 'dispatcher' && (<>
          <View style={authS.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={14} color={C.accent} />
            <Text style={authS.infoText}>A unique tracking ID will be generated for this shipment. Share it with your receiver after signing up.</Text>
          </View>
          <Field icon="map-marker-outline" label="DESTINATION" placeholder="e.g. Manipal Hospital, Mumbai" value={destination} onChangeText={setDestination} />
          <Field icon="clock-outline" label="ESTIMATED ARRIVAL" placeholder="e.g. 28 Apr 2026, 14:30 IST" value={eta} onChangeText={setEta} />
          <Field icon="pill" label="SHIPMENT CONTENTS" placeholder="e.g. Polio Vaccines — 200 vials" value={contents} onChangeText={setContents} />
        </>)}

        {/* Receiver signup or any login: enter tracking ID */}
        {(mode === 'login' || role === 'receiver') && (
          <Field icon="barcode-scan" label="SHIPMENT TRACKING ID" placeholder="e.g. CS-AB12-XY9" value={trackId} onChangeText={setTrackId} autoCapitalize="characters" hint={role === 'receiver' ? 'Enter the ID shared by the sender.' : 'Your shipment tracking ID.'} />
        )}

        {!!error && (() => {
          const isHint = error.startsWith("Looks like") || error.startsWith("No account found");
          return (
            <View style={[authS.errorBox, isHint && { backgroundColor: C.amberDim, borderColor: C.amber + '40' }]}>
              <MaterialCommunityIcons
                name={isHint ? 'information-outline' : 'alert-circle-outline'}
                size={14}
                color={isHint ? C.amber : C.red}
              />
              <Text style={[authS.errorText, isHint && { color: C.amber }]}>{error}</Text>
            </View>
          );
        })()}

        <TouchableOpacity style={[authS.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          <MaterialCommunityIcons name={mode === 'login' ? 'login' : 'account-plus'} size={17} color={C.bg} />
          <Text style={authS.btnText}>{loading ? 'AUTHENTICATING...' : mode === 'login' ? 'SIGN IN' : role === 'dispatcher' ? 'CREATE SHIPMENT' : 'START TRACKING'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={authS.switchText}>
            {mode === 'login' ? "No account? " : 'Have an account? '}
            <Text style={{ color: C.accent, fontWeight: '800' }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={authS.footer}>Authorized Personnel Only · RVCE Innovation Lab</Text>
    </ScrollView>
  );
}

// Reusable form field
const Field = ({ icon, label, hint, rightIcon, onRightIcon, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={authS.fieldLabel}>{label}</Text>
    <View style={authS.inputRow}>
      <MaterialCommunityIcons name={icon} size={17} color={C.textMute} style={{ paddingLeft: 14 }} />
      <TextInput style={[authS.input, { flex: 1 }]} placeholderTextColor={C.textMute} {...props} />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIcon} style={{ paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name={rightIcon} size={17} color={C.textMute} />
        </TouchableOpacity>
      )}
    </View>
    {hint && <Text style={authS.hint}>{hint}</Text>}
  </View>
);

const authS = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 60 },
  logoBlock: { alignItems: 'center', marginBottom: 30 },
  logoRing: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentDim, borderWidth: 1.5, borderColor: C.accent + '50', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoText: { color: C.accent, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  logoSub: { color: C.textMute, fontSize: 9, fontWeight: '800', letterSpacing: 3, marginTop: 3 },
  card: { width: '100%', backgroundColor: C.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.border },
  tabRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 22 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent },
  tabText: { color: C.textSec, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.bg, fontWeight: '900' },
  heading: { color: C.textPri, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  sub: { color: C.textSec, fontSize: 12, lineHeight: 18, marginBottom: 20 },
  fieldLabel: { color: C.textMute, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  input: { color: C.textPri, paddingVertical: 13, paddingHorizontal: 10, fontSize: 14 },
  hint: { color: C.textMute, fontSize: 9, marginTop: 5 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.redDim, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.red + '30' },
  errorText: { color: C.red, fontSize: 12, flex: 1 },
  btn: { backgroundColor: C.accent, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  btnText: { color: C.bg, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  switchText: { color: C.textSec, fontSize: 13 },
  footer: { color: C.textMute, fontSize: 9, marginTop: 24, letterSpacing: 0.5 },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  roleIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  roleTitle: { color: C.textPri, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  roleSub: { color: C.textSec, fontSize: 11, lineHeight: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  backText: { color: C.textSec, fontSize: 13, flex: 1 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  rolePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.accentDim, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.accent + '30' },
  infoText: { color: C.textSec, fontSize: 11, lineHeight: 16, flex: 1 },
});

// ═══════════════════════════════════════════════════════════════
// MISSION SCREEN
// ═══════════════════════════════════════════════════════════════
function MissionScreen() {
  return (
    <View style={gs.screen}>
      <Header title="ColdSync" right={<Pill label="MISSION" icon="information" />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HERO */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 }}>
          <Text style={gs.pageEyebrow}>ABOUT COLDSYNC</Text>
          <Text style={[gs.pageTitle, { fontSize: 38, lineHeight: 44 }]}>
            Keeping{"\n"}<Text style={{ color: C.accent }}>life-saving</Text>{"\n"}medicines cold.
          </Text>
          <View style={gs.accentBar} />
          <Text style={gs.pageSub}>
            An IoT-powered cold chain intelligence platform that monitors vaccines and biologics in real-time — from warehouse to last-mile delivery.
          </Text>
        </View>

        {/* THE PROBLEM */}
        <SectionHeader label="The Problem We Solve" />
        <View style={[gs.glassCard, { marginHorizontal: 20, borderColor: C.red + '30', marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MaterialCommunityIcons name="alert-octagram" size={16} color={C.red} />
            <Text style={{ color: C.red, fontSize: 10, fontWeight: '800', letterSpacing: 1, flex: 1 }}>COLD CHAIN FAILURE IS A GLOBAL HEALTHCARE CRISIS</Text>
          </View>
          <Text style={gs.bodyText}>
            Every year, <Text style={{ color: C.textPri, fontWeight: '700' }}>up to 50% of all vaccines are wasted globally</Text> — not due to disease, but due to temperature excursions during storage and transit. In India alone, cold chain failures cost the healthcare system <Text style={{ color: C.textPri, fontWeight: '700' }}>billions of rupees annually</Text>, silently undermining immunization programs.{"\n\n"}
            The root cause: <Text style={{ color: C.textPri, fontWeight: '700' }}>no real-time visibility</Text>. Shipments travel blind. By the time a breach is detected, damage is already done.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 4 }}>
          {[
            { icon: 'alert-octagram', color: C.red,   stat: '50%',  label: 'Vaccine Waste Rate' },
            { icon: 'currency-inr',   color: C.amber, stat: '₹35Bn+', label: 'Annual Losses (India)' },
          ].map((item, i) => (
            <View key={i} style={[gs.glassCard, { flex: 1, alignItems: 'center' }]}>
              <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              <Text style={[gs.statBig, { color: item.color, marginTop: 8 }]}>{item.stat}</Text>
              <Text style={[gs.statLabel, { textAlign: 'center', fontSize: 11 }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* WHAT IS COLDSYNC */}
        <SectionHeader label="Our Solution" />
        <View style={[gs.glassCard, { marginHorizontal: 20, borderColor: C.accent + '30' }]}>
          <Text style={{ color: C.accent, fontSize: 16, fontWeight: '900', marginBottom: 10 }}>What is ColdSync?</Text>
          <Text style={gs.bodyText}>
            ColdSync is an <Text style={{ color: C.textPri, fontWeight: '700' }}>ESP32-based IoT monitoring system</Text> that attaches to cold-chain shipment boxes and streams live temperature, humidity, and battery data to a cloud dashboard in real-time.{"\n\n"}
            When a temperature breach occurs, ColdSync <Text style={{ color: C.textPri, fontWeight: '700' }}>automatically detects it, triggers hardware mitigation</Text> (activating cooling fans and PCM phase-change material systems), and logs a timestamped alert — creating a full chain-of-custody audit trail visible to every stakeholder.
          </Text>
        </View>

        {/* HOW IT WORKS */}
        <SectionHeader label="How It Works" />
        <View style={[gs.glassCard, { marginHorizontal: 20 }]}>
          {[
            { num: '01', icon: 'cpu-64-bit',       title: 'Hardware Sensors on Every Box',  sub: 'ESP32 + DS18B20 sensors stream temperature & humidity to Firebase every few seconds.' },
            { num: '02', icon: 'bell-alert',        title: 'Intelligent Breach Detection',   sub: 'Exceeding 8°C triggers an instant alert, fan activation, and PCM mitigation — automatically.' },
            { num: '03', icon: 'monitor-dashboard', title: 'Live Dashboard for Operators',   sub: 'Mobile app shows unit health, PCM state, battery load, and a full event timeline.' },
            { num: '04', icon: 'file-chart',        title: 'Automated Audit Reports',        sub: 'One tap generates a compliance-ready PDF with breach stats, risk levels, and custody logs.' },
          ].map((item, i, arr) => (
            <View key={i} style={[gs.solRow, { alignItems: 'flex-start', paddingVertical: 14 }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '30', alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2 }}>
                <Text style={{ color: C.accent, fontSize: 10, fontWeight: '900' }}>{item.num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPri, fontSize: 13, fontWeight: '800', marginBottom: 4 }}>{item.title}</Text>
                <Text style={{ color: C.textSec, fontSize: 12, lineHeight: 18 }}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* IMPACT */}
        <SectionHeader label="Impact at a Glance" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 }}>
          {[
            { label: 'Detection', val: 'Real-time\nAlerts',   color: C.accent },
            { label: 'Response',  val: 'Auto\nMitigation',    color: C.blue },
            { label: 'Tracing',   val: 'Full Audit\nTrail',   color: C.amber },
            { label: 'Coverage',  val: 'Multi-box\nTracking', color: C.red },
          ].map((item, i) => (
            <View key={i} style={[gs.glassCard, { width: '47%', alignItems: 'center', paddingVertical: 16 }]}>
              <Text style={[gs.cardLabel, { textAlign: 'center' }]}>{item.label}</Text>
              <Text style={{ color: item.color, fontSize: 15, fontWeight: '900', marginTop: 6, textAlign: 'center', lineHeight: 22 }}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* VISION */}
        <SectionHeader label="Our Vision" />
        <View style={[gs.glassCard, { marginHorizontal: 20, borderColor: C.blue + '30' }]}>
          <Pill label="LONG-TERM IMPACT" color={C.blue} />
          <Text style={[gs.bodyText, { marginTop: 14 }]}>
            We envision a future where <Text style={{ color: C.textPri, fontWeight: '700' }}>every vaccine, biologic, and temperature-sensitive medicine</Text> reaches its destination with its potency intact — regardless of geography, infrastructure, or logistical complexity.{"\n\n"}
            ColdSync is not just a monitoring tool. It is <Text style={{ color: C.textPri, fontWeight: '700' }}>the trust infrastructure for healthcare logistics</Text> — ensuring that the last mile, often the most vulnerable, is finally as accountable as the first.
          </Text>
        </View>

        <Text style={gs.quote}>
          "Revolutionizing global healthcare through precision cold chain intelligence — built at RVCE, designed for the world."
        </Text>

      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// HUB SCREEN
// ═══════════════════════════════════════════════════════════════
function HubScreen({ navigation, user, onSignOut }) {
  return (
    <View style={gs.screen}>
      <Header
        title="ColdSync"
        right={
          <TouchableOpacity onPress={onSignOut} style={hub.signOutBtn}>
            <MaterialCommunityIcons name="logout" size={14} color={C.red} />
            <Text style={hub.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28 }}>
          <Text style={gs.pageEyebrow}>{user?.isNew ? 'WELCOME' : 'WELCOME BACK'}</Text>
          <Text style={gs.pageTitle}>{(user?.name || 'Operator').toUpperCase()}</Text>
          <View style={gs.accentBar} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill
              label={user?.role === 'receiver' ? 'RECEIVER' : 'DISPATCHER'}
              icon={user?.role === 'receiver' ? 'package-variant' : 'truck-delivery-outline'}
              color={user?.role === 'receiver' ? C.blue : C.accent}
            />
            <Pill label={user?.trackingId || 'CS-RVCE-01'} icon="barcode-scan" color={C.textSec} />
          </View>

          {/* Show tracking ID prominently for new dispatchers so they can share it */}
          {user?.isNew && user?.role === 'dispatcher' && (
            <View style={hub.shareCard}>
              <View style={{ flex: 1 }}>
                <Text style={hub.shareLabel}>YOUR TRACKING ID — SHARE WITH RECEIVER</Text>
                <Text style={hub.shareId}>{user?.trackingId}</Text>
                <Text style={hub.shareSub}>The receiver needs this ID to track your shipment</Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={hub.shareBtn}
                  onPress={() => {
                    Clipboard.setString(user?.trackingId);
                    alert('Tracking ID copied to clipboard!');
                  }}
                >
                  <MaterialCommunityIcons name="content-copy" size={14} color={C.accent} />
                  <Text style={hub.shareBtnText}>COPY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[hub.shareBtn, { backgroundColor: C.blueDim, borderColor: C.blue + '40' }]}
                  onPress={() => Share.share({
                    message: `Your ColdSync shipment tracking ID is: ${user?.trackingId}
Track your shipment live on the ColdSync app.`,
                    title: 'ColdSync Tracking ID',
                  })}
                >
                  <MaterialCommunityIcons name="share-variant" size={14} color={C.blue} />
                  <Text style={[hub.shareBtnText, { color: C.blue }]}>SHARE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {[
          { screen: 'Units',   icon: 'view-grid',           color: C.accent,   title: 'Asset Telemetry',  sub: 'Live temperature & hardware feed' },
          { screen: 'Transit', icon: 'radar',               color: C.blue,     title: 'Live Transit',     sub: 'Track shipment & custody logs' },
          { screen: 'Audit',   icon: 'file-chart',          color: C.amber,    title: 'Audit Report',     sub: 'Breach history & compliance data' },
          { screen: 'Mission', icon: 'information-variant', color: C.textSec,  title: 'Our Mission',      sub: 'About the ColdSync initiative' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={hub.navCard} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
            <View style={[hub.iconBox, { borderColor: item.color + '50', backgroundColor: item.color + '10' }]}>
              <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={hub.navTitle}>{item.title}</Text>
              <Text style={hub.navSub}>{item.sub}</Text>
            </View>
            <View style={hub.chevronBox}>
              <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMute} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const hub = StyleSheet.create({
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.redDim, borderWidth: 1, borderColor: C.red + '30', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  signOutText: { color: C.red, fontSize: 11, fontWeight: '700' },
  navCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  iconBox: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  navTitle: { color: C.textPri, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  navSub: { color: C.textSec, fontSize: 12 },
  chevronBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '40', borderRadius: 16, padding: 16, marginTop: 16 },
  shareLabel: { color: C.textMute, fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  shareId: { color: C.accent, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  shareSub: { color: C.textSec, fontSize: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '40', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  shareBtnText: { color: C.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});

// ═══════════════════════════════════════════════════════════════
// UNITS SCREEN
// ═══════════════════════════════════════════════════════════════
function UnitsScreen() {
  const [selectedBox, setSelectedBox] = useState(null);
  const [liveBoxes, setLiveBoxes]     = useState([]);
  const systemState = useRef({});

  const pushLog = (unitId, temp, type) => {
    if (systemState.current[unitId] === type) return;
    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef);
    let logEntry = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: 'HARDWARE_SENSOR',
      status: 'active',
    };
    if (type === 'BREACH') {
      logEntry.title = 'CRITICAL TEMP ALERT';
      logEntry.desc  = `Sensor ${unitId} detected ${temp}°C. Hardware mitigation engaged.`;
    } else if (type === 'STABLE') {
      logEntry.title = 'SYSTEM STABILIZED';
      logEntry.desc  = `Sensor ${unitId} recovered to ${temp}°C. Safety bounds restored.`;
    }
    set(newLogRef, logEntry);
    systemState.current[unitId] = type;
  };

  useEffect(() => {
    const boxesRef = ref(db, 'units');
    const unsubscribe = onValue(boxesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedData = Object.keys(data).map(key => {
          const box = data[key];
          const currentTemp = parseFloat(box.temp);
          if (currentTemp > 8.0) {
            pushLog(key, currentTemp, 'BREACH');
          } else if (currentTemp <= 8.0 && systemState.current[key] === 'BREACH') {
            pushLog(key, currentTemp, 'STABLE');
          }
          return { id: key, ...box };
        });
        setLiveBoxes(formattedData);
      } else {
        setLiveBoxes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const isBreach = (box) => parseFloat(box.temp) > 8.0;

  return (
    <View style={gs.screen}>
      <Header
        title="ColdSync"
        right={
          <View style={units.liveBadge}>
            <View style={units.pulseDot} />
            <Text style={units.liveText}>SENSOR LIVE</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <SectionHeader label="Inventory Health" />
        {liveBoxes.length === 0 ? (
          <View style={units.emptyState}>
            <MaterialCommunityIcons name="radar" size={36} color={C.textMute} />
            <Text style={units.emptyText}>Searching for active telemetry…</Text>
          </View>
        ) : (
          <View style={units.grid}>
            {liveBoxes.map((box) => {
              const breach = isBreach(box);
              const color  = breach ? C.red : C.accent;
              return (
                <TouchableOpacity
                  key={box.id}
                  onPress={() => setSelectedBox(box)}
                  style={[units.card, { borderColor: color + '40' }]}
                  activeOpacity={0.8}
                >
                  <View style={[units.cardHeader, { backgroundColor: color + '12' }]}>
                    <Text style={[units.cardHeaderText, { color }]}>{box.id.toUpperCase()}</Text>
                    <View style={[units.statusDot, { backgroundColor: color }]} />
                  </View>
                  <View style={units.tempBlock}>
                    <Text style={[units.tempBig, { color }]}>{box.temp}°</Text>
                    <Text style={units.tempUnit}>C</Text>
                  </View>
                  <View style={[units.cardFooter, { borderTopColor: color + '20' }]}>
                    <Text style={[units.cardStatus, { color }]}>{breach ? '⚠ BREACH' : '✓ STABLE'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={!!selectedBox} transparent animationType="fade">
        <View style={units.overlay}>
          <View style={units.modal}>
            <View style={units.modalTopRow}>
              <Text style={units.modalTitle}>SENSORS: {selectedBox?.id?.toUpperCase()}</Text>
              <Pill
                label={parseFloat(selectedBox?.temp) > 8 ? 'BREACH' : 'STABLE'}
                color={parseFloat(selectedBox?.temp) > 8 ? C.red : C.accent}
              />
            </View>
            <View style={units.ringsRow}>
              {[
                { pct: selectedBox?.powerUsed || 0, color: parseFloat(selectedBox?.temp) > 8 ? C.red : C.blue, label: 'BATTERY LOAD' },
                { pct: 100 - (selectedBox?.powerUsed || 0), color: C.accent, label: 'LIFE LEFT' },
              ].map((r, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                  <PowerRing percentage={r.pct} color={r.color} />
                  <Text style={units.ringLabel}>{r.label}</Text>
                </View>
              ))}
            </View>
            <View style={units.diagGrid}>
              {[
                { k: 'TEMP',        v: `${selectedBox?.temp}°C` },
                { k: 'HUMIDITY',    v: selectedBox?.humidity || '45%' },
                { k: 'PCM STATE',   v: parseFloat(selectedBox?.temp) > 8 ? 'CRITICAL' : 'OPTIMAL' },
                { k: 'COOLING FAN', v: parseFloat(selectedBox?.temp) > 8 ? 'ACTIVE' : 'IDLE' },
              ].map((d, i) => (
                <View key={i} style={units.diagItem}>
                  <Text style={units.diagKey}>{d.k}</Text>
                  <Text style={units.diagVal}>{d.v}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={units.closeBtn} onPress={() => setSelectedBox(null)}>
              <Text style={units.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const units = StyleSheet.create({
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.accent + '30' },
  pulseDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent, marginRight: 6 },
  liveText: { color: C.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  emptyText: { color: C.textSec, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  card: { width: '47%', backgroundColor: C.surface, borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },
  cardHeader: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  tempBlock: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 18 },
  tempBig: { fontSize: 38, fontWeight: '900', lineHeight: 42 },
  tempUnit: { fontSize: 18, fontWeight: '700', color: C.textSec, marginBottom: 4 },
  cardFooter: { borderTopWidth: 1, paddingVertical: 10, alignItems: 'center' },
  cardStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(6,8,15,0.92)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: C.surface, padding: 24, borderRadius: 28, borderWidth: 1, borderColor: C.borderHi },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: C.textPri, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  ringLabel: { color: C.textMute, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  diagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  diagItem: { width: '47%', backgroundColor: C.card, padding: 14, borderRadius: 12 },
  diagKey: { color: C.textMute, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  diagVal: { color: C.textPri, fontSize: 14, fontWeight: '800', marginTop: 4 },
  closeBtn: { backgroundColor: C.accent, padding: 16, borderRadius: 12 },
  closeBtnText: { textAlign: 'center', fontWeight: '900', color: C.bg, fontSize: 12, letterSpacing: 1.5 },
});

// ═══════════════════════════════════════════════════════════════
// TRANSIT SCREEN
// ═══════════════════════════════════════════════════════════════
function TransitScreen({ trackingId, role }) {
  const [remarks, setRemarks]           = useState('');
  const [logs, setLogs]                 = useState([]);
  const [shipmentInfo, setShipmentInfo] = useState(null);

  useEffect(() => {
    const logsRef = ref(db, 'logs');
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedLogs = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        setLogs(formattedLogs);
      }
    });

    // Pull shipment metadata (destination, eta, status) from Firebase using tracking ID
    const shipmentRef = ref(db, `shipments/${trackingId}`);
    const unsubscribeShipment = onValue(shipmentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setShipmentInfo(data);
    });

    return () => { unsubscribeLogs(); unsubscribeShipment(); };
  }, [trackingId]);

  const [editingShipment, setEditingShipment] = useState(false);
  const [editDest, setEditDest]               = useState('');
  const [editEta, setEditEta]                 = useState('');
  const [editStatus, setEditStatus]           = useState('');

  const openEdit = () => {
    setEditDest(shipmentInfo?.destination || '');
    setEditEta(shipmentInfo?.eta || '');
    setEditStatus(shipmentInfo?.status || 'IN-TRANSIT');
    setEditingShipment(true);
  };

  const saveShipmentInfo = () => {
    const shipmentRef = ref(db, `shipments/${trackingId}`);
    set(shipmentRef, {
      destination: editDest.trim() || 'Not set',
      eta: editEta.trim() || 'Not set',
      status: editStatus.trim() || 'IN-TRANSIT',
    });
    setEditingShipment(false);
  };

  const handleAddLog = () => {
    if (remarks.trim() === '') return;
    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef);
    set(newLogRef, {
      title: 'FIELD LOG ENTRY',
      desc: remarks,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: 'USER_AUTH',
      status: 'active',
    });
    setRemarks('');
  };

  return (
    <View style={gs.screen}>
      <Header title="ColdSync" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ETA card */}
        <View style={transit.etaCard}>
          <View>
            <Text style={transit.etaLabel}>ESTIMATED ARRIVAL</Text>
            <Text style={transit.etaVal}>{shipmentInfo?.eta || 'Not set'}</Text>
          </View>
          <View style={transit.etaIcon}>
            <MaterialCommunityIcons name="clock-fast" size={26} color={C.accent} />
          </View>
        </View>

        {/* Asset card */}
        <View style={[gs.glassCard, { marginTop: 12, marginBottom: 0 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={gs.cardLabel}>ASSET TRACKING ID</Text>
            <TouchableOpacity onPress={openEdit} style={transit.editBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={12} color={C.blue} />
              <Text style={transit.editBtnText}>EDIT</Text>
            </TouchableOpacity>
          </View>
          <Text style={transit.assetId}>{trackingId || 'CS-RVCE-01'}</Text>
          <View style={transit.divider} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={transit.metKey}>STATUS</Text>
              <Text style={transit.metVal}>{shipmentInfo?.status || 'IN-TRANSIT'}</Text>
            </View>
            <View>
              <Text style={transit.metKey}>DESTINATION</Text>
              <Text style={transit.metVal}>{shipmentInfo?.destination || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Edit shipment modal */}
        <Modal visible={editingShipment} transparent animationType="slide">
          <View style={units.overlay}>
            <View style={units.modal}>
              <Text style={units.modalTitle}>EDIT SHIPMENT INFO</Text>
              <Text style={[gs.cardLabel, { marginTop: 14 }]}>DESTINATION</Text>
              <TextInput
                style={transit.editInput}
                placeholder="e.g. Manipal Hospital, Delhi"
                placeholderTextColor={C.textMute}
                value={editDest}
                onChangeText={setEditDest}
              />
              <Text style={[gs.cardLabel, { marginTop: 12 }]}>ETA</Text>
              <TextInput
                style={transit.editInput}
                placeholder="e.g. Today, 14:30 IST"
                placeholderTextColor={C.textMute}
                value={editEta}
                onChangeText={setEditEta}
              />
              <Text style={[gs.cardLabel, { marginTop: 12 }]}>STATUS</Text>
              <TextInput
                style={transit.editInput}
                placeholder="e.g. IN-TRANSIT"
                placeholderTextColor={C.textMute}
                value={editStatus}
                onChangeText={setEditStatus}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[units.closeBtn, { marginTop: 20 }]} onPress={saveShipmentInfo}>
                <Text style={units.closeBtnText}>SAVE CHANGES</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingShipment(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: C.textSec, fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <SectionHeader label="Chain of Custody" />

        {/* Timeline */}
        <View style={gs.glassCard}>
          {logs.map((step, index) => {
            const isAlert = step.title === 'CRITICAL TEMP ALERT';
            const dotColor = isAlert ? C.red : C.accent;
            return (
              <View key={step.id || index} style={transit.row}>
                <View style={transit.timelineCol}>
                  <View style={[transit.dot, { backgroundColor: dotColor }]} />
                  {index !== logs.length - 1 && <View style={transit.line} />}
                </View>
                <View style={transit.content}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={[transit.stepTitle, { color: isAlert ? C.red : C.textPri }]}>{step.title}</Text>
                    <Text style={transit.stepUser}>{step.user}</Text>
                  </View>
                  <Text style={transit.stepDesc}>{step.desc}</Text>
                  <Text style={transit.stepTime}>{step.time}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Field log — dispatcher only */}
        {role !== 'receiver' && (
          <View style={[gs.glassCard, { marginTop: 16 }]}>
            <Text style={gs.cardLabel}>ADD FIELD LOG</Text>
            <TextInput
              style={transit.input}
              placeholder="Type log details…"
              placeholderTextColor={C.textMute}
              multiline
              value={remarks}
              onChangeText={setRemarks}
            />
            <TouchableOpacity style={transit.addBtn} onPress={handleAddLog}>
              <MaterialCommunityIcons name="plus" size={16} color={C.bg} />
              <Text style={transit.addBtnText}>UPDATE TIMELINE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accept / Reject — receiver only */}
        {role === 'receiver' && (
          <View style={[gs.glassCard, { marginTop: 16 }]}>
            <Text style={gs.cardLabel}>SHIPMENT DECISION</Text>
            <Text style={[gs.bodyText, { marginBottom: 16 }]}>
              Review the audit report and temperature history before accepting this delivery.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[transit.decisionBtn, { backgroundColor: C.accentDim, borderColor: C.accent + '50', flex: 1 }]}
                onPress={() => {
                  const logsRef = ref(db, 'logs');
                  const newLogRef = push(logsRef);
                  set(newLogRef, {
                    title: 'SHIPMENT ACCEPTED',
                    desc: 'Receiver confirmed delivery. Shipment accepted.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    user: 'RECEIVER',
                    status: 'active',
                  });
                  const shipmentRef = ref(db, `shipments/${trackingId}`);
                  set(shipmentRef, { ...shipmentInfo, status: 'DELIVERED' });
                  alert('Shipment accepted. Logged to chain of custody.');
                }}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={20} color={C.accent} />
                <Text style={[transit.decisionText, { color: C.accent }]}>ACCEPT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[transit.decisionBtn, { backgroundColor: C.redDim, borderColor: C.red + '50', flex: 1 }]}
                onPress={() => {
                  const logsRef = ref(db, 'logs');
                  const newLogRef = push(logsRef);
                  set(newLogRef, {
                    title: 'SHIPMENT REJECTED',
                    desc: 'Receiver rejected delivery due to cold chain concerns.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    user: 'RECEIVER',
                    status: 'active',
                  });
                  const shipmentRef = ref(db, `shipments/${trackingId}`);
                  set(shipmentRef, { ...shipmentInfo, status: 'REJECTED' });
                  alert('Shipment rejected. Logged to chain of custody.');
                }}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={C.red} />
                <Text style={[transit.decisionText, { color: C.red }]}>REJECT</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const transit = StyleSheet.create({
  etaCard: { backgroundColor: C.accentDim, padding: 22, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.accent + '30' },
  etaLabel: { color: C.textSec, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  etaVal: { color: C.accent, fontSize: 22, fontWeight: '900' },
  etaIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.accent + '20', justifyContent: 'center', alignItems: 'center' },
  assetId: { color: C.textPri, fontSize: 24, fontWeight: '900', marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  metKey: { color: C.textMute, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  metVal: { color: C.textPri, fontSize: 13, fontWeight: '800', marginTop: 3 },
  row: { flexDirection: 'row', minHeight: 72 },
  timelineCol: { alignItems: 'center', marginRight: 14, width: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 1, flex: 1, backgroundColor: C.border },
  content: { flex: 1, paddingBottom: 16 },
  stepTitle: { fontSize: 12, fontWeight: '800' },
  stepUser: { color: C.blue, fontSize: 8, fontWeight: '700' },
  stepDesc: { color: C.textSec, fontSize: 11, marginTop: 2, lineHeight: 16 },
  stepTime: { color: C.textMute, fontSize: 10, marginTop: 4 },
  input: { backgroundColor: C.bg, borderRadius: 12, height: 64, padding: 14, color: C.textPri, marginTop: 12, marginBottom: 12, fontSize: 13, borderWidth: 1, borderColor: C.border },
  addBtn: { backgroundColor: C.accent, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: C.bg, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blueDim, borderWidth: 1, borderColor: C.blue + '40', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  editBtnText: { color: C.blue, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  editInput: { backgroundColor: C.bg, borderRadius: 12, padding: 13, color: C.textPri, fontSize: 13, borderWidth: 1, borderColor: C.border, marginTop: 6 },
  decisionBtn: { padding: 16, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  decisionText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});

// ═══════════════════════════════════════════════════════════════
// AUDIT SCREEN
// ═══════════════════════════════════════════════════════════════
function AuditScreen() {
  const [stats, setStats]           = useState({ failures: 0, handled: 0, efficiency: 100 });
  const [avgTemp, setAvgTemp]       = useState(0);
  const [allLogs, setAllLogs]       = useState([]);
  const [units, setUnits]           = useState([]);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    const logsRef  = ref(db, 'logs');
    const unitsRef = ref(db, 'units');

    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logArray = Object.values(data);
        setAllLogs(logArray);
        const breaches  = logArray.filter(l => l.title === 'CRITICAL TEMP ALERT').length;
        const mitigated = logArray.filter(l => l.title === 'SYSTEM STABILIZED').length;
        const rate = breaches > 0 ? Math.round((mitigated / breaches) * 100) : 100;
        setStats({ failures: breaches, handled: mitigated, efficiency: rate });
      }
    });

    const unsubscribeUnits = onValue(unitsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unitArray = Object.values(data);
        setUnits(unitArray);
        const sum = unitArray.reduce((acc, curr) => acc + parseFloat(curr.temp || 0), 0);
        setAvgTemp((sum / unitArray.length).toFixed(1));
      }
    });

    return () => { unsubscribeLogs(); unsubscribeUnits(); };
  }, []);

  const fieldLogs   = allLogs.filter(l => l.title === 'FIELD LOG ENTRY').length;
  const uptimeScore = Math.max(80, 100 - stats.failures * 2);
  const pcmHealth   = units.filter(u => parseFloat(u.temp) <= 8.0).length;
  const pcmPct      = units.length > 0 ? Math.round((pcmHealth / units.length) * 100) : 100;

  const riskLevel = stats.failures === 0 ? 'LOW' : stats.efficiency < 70 ? 'HIGH' : 'MEDIUM';
  const riskColor = riskLevel === 'HIGH' ? C.red : riskLevel === 'MEDIUM' ? C.amber : C.accent;

  const generateReport = useCallback(async () => {
    setGenerating(true);
    try {
      const now     = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const unitRows = units.map((u, i) =>
        `<tr>
          <td>Unit-${String(i+1).padStart(2,'0')}</td>
          <td style="color:${parseFloat(u.temp)>8?'#c0392b':'#27ae60'};font-weight:700">${parseFloat(u.temp).toFixed(1)}°C</td>
          <td>${parseFloat(u.temp)>8?'BREACH':'STABLE'}</td>
          <td>${u.powerUsed || 'N/A'}%</td>
          <td>${u.humidity || 'N/A'}</td>
        </tr>`
      ).join('');

      const recentLogs = allLogs.slice(-8).reverse().map(l =>
        `<tr>
          <td>${l.time || '--'}</td>
          <td style="color:${l.title==='CRITICAL TEMP ALERT'?'#c0392b':'#1a8c5b'};font-weight:600">${l.title || '--'}</td>
          <td>${l.desc || '--'}</td>
          <td>${l.user || '--'}</td>
        </tr>`
      ).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Helvetica Neue,Arial,sans-serif;background:#f4f6f8;color:#1a2236}
  .cover{background:linear-gradient(135deg,#0A192F,#020C1B);padding:60px 50px 50px;position:relative}
  .cover-logo{color:#00FFAD;font-size:34px;font-weight:900}
  .cover-tag{color:#8892B0;font-size:11px;letter-spacing:3px;margin-top:4px;text-transform:uppercase}
  .cover-title{color:#fff;font-size:22px;font-weight:800;margin-top:28px}
  .cover-meta{color:#8892B0;font-size:11px;margin-top:6px}
  .cover-badge{position:absolute;top:50px;right:50px;background:#00FFAD20;border:1px solid #00FFAD;border-radius:8px;padding:8px 14px;color:#00FFAD;font-size:10px;font-weight:700;letter-spacing:2px}
  .body{padding:30px 40px 50px}
  .section-label{font-size:9px;font-weight:800;letter-spacing:3px;color:#8892B0;text-transform:uppercase;margin:32px 0 14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  .kpi-grid{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
  .kpi{flex:1;min-width:130px;background:#fff;border-radius:12px;padding:18px;border:1px solid #e8edf3}
  .kpi-label{font-size:9px;font-weight:700;color:#8892B0;letter-spacing:1.5px;text-transform:uppercase}
  .kpi-val{font-size:28px;font-weight:900;margin-top:4px}
  .kpi-sub{font-size:10px;color:#8892B0;margin-top:4px}
  .bar-row{display:flex;align-items:center;gap:10px;margin:8px 0}
  .bar-label{font-size:10px;font-weight:700;color:#8892B0;width:130px;flex-shrink:0}
  .bar-track{flex:1;background:#e8edf3;border-radius:4px;height:10px}
  .bar-fill{height:10px;border-radius:4px}
  .bar-pct{font-size:10px;font-weight:800;color:#1a2236;width:36px;text-align:right}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{background:#f4f6f8;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8892B0;padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0}
  td{font-size:11px;padding:10px 12px;border-bottom:1px solid #f0f4f8;color:#1a2236}
  tr:nth-child(even) td{background:#f9fbfd}
  .risk{border-radius:12px;padding:18px 22px;margin:8px 0 20px;border-left:4px solid ${riskColor};background:${riskColor}18}
  .risk-title{font-size:13px;font-weight:800;color:${riskColor}}
  .risk-sub{font-size:11px;color:#8892B0;margin-top:4px}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:9px;color:#b0b8c9;display:flex;justify-content:space-between}
</style></head><body>
<div class="cover">
  <div class="cover-badge">LIVE AUDIT REPORT</div>
  <div class="cover-logo">ColdSync</div>
  <div class="cover-tag">RVCE Innovation Lab · Cold Chain Intelligence Platform</div>
  <div class="cover-title">System Performance & Audit Report</div>
  <div class="cover-meta">Generated: ${dateStr} at ${timeStr} IST</div>
</div>
<div class="body">
  <div class="section-label">Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Breaches</div><div class="kpi-val" style="color:#c0392b">${stats.failures}</div><div class="kpi-sub">Thermal violations</div></div>
    <div class="kpi"><div class="kpi-label">Neutralized</div><div class="kpi-val" style="color:#1a8c5b">${stats.handled}</div><div class="kpi-sub">Auto-mitigated</div></div>
    <div class="kpi"><div class="kpi-label">Avg Temp</div><div class="kpi-val" style="color:${parseFloat(avgTemp)>8?'#c0392b':'#1a2236'}">${avgTemp}°C</div><div class="kpi-sub">Safe: 2–8°C</div></div>
    <div class="kpi"><div class="kpi-label">Field Logs</div><div class="kpi-val" style="color:#2563eb">${fieldLogs}</div><div class="kpi-sub">Manual entries</div></div>
  </div>
  <div class="section-label">System Health</div>
  <div class="bar-row"><div class="bar-label">Cooling Efficiency</div><div class="bar-track"><div class="bar-fill" style="width:${stats.efficiency}%;background:#00FFAD"></div></div><div class="bar-pct">${stats.efficiency}%</div></div>
  <div class="bar-row"><div class="bar-label">System Uptime</div><div class="bar-track"><div class="bar-fill" style="width:${uptimeScore}%;background:#4285F4"></div></div><div class="bar-pct">${uptimeScore}%</div></div>
  <div class="bar-row"><div class="bar-label">PCM Integrity</div><div class="bar-track"><div class="bar-fill" style="width:${pcmPct}%;background:#FFB347"></div></div><div class="bar-pct">${pcmPct}%</div></div>
  <div class="section-label">Risk Assessment</div>
  <div class="risk">
    <div class="risk-title">RISK LEVEL: ${riskLevel}</div>
    <div class="risk-sub">${riskLevel === 'HIGH' ? 'Critical — immediate inspection required.' : riskLevel === 'MEDIUM' ? 'Moderate — monitor closely before next dispatch.' : 'System stable — no intervention needed.'}</div>
  </div>
  ${units.length > 0 ? `<div class="section-label">Unit Status</div><table><thead><tr><th>Unit</th><th>Temp</th><th>Status</th><th>Load</th><th>Humidity</th></tr></thead><tbody>${unitRows}</tbody></table>` : ''}
  ${allLogs.length > 0 ? `<div class="section-label">Recent Logs</div><table><thead><tr><th>Time</th><th>Event</th><th>Description</th><th>Source</th></tr></thead><tbody>${recentLogs}</tbody></table>` : ''}
  <div class="footer"><span>ColdSync · RVCE Innovation Lab · Confidential</span><span>${dateStr}, ${timeStr}</span></div>
</div></body></html>`;

      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) win.focus();
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'ColdSync Audit Report', UTI: 'com.adobe.pdf' });
        }
      }
      setReportReady(true);
      setTimeout(() => setReportReady(false), 3000);
    } catch (e) {
      console.error('Report generation failed:', e);
    } finally {
      setGenerating(false);
    }
  }, [stats, avgTemp, allLogs, units, riskLevel, riskColor, fieldLogs, uptimeScore, pcmPct]);

  return (
    <View style={gs.screen}>
      <Header title="ColdSync" right={<Pill label="LIVE AUDIT" icon="pulse" color={C.accent} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>

        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
          <Text style={gs.pageEyebrow}>REAL-TIME</Text>
          <Text style={gs.pageTitle}>AUDIT</Text>
          <View style={gs.accentBar} />
          <Text style={gs.pageSub}>Live diagnostics from your active shipment</Text>
        </View>

        {/* KPI Grid */}
        <View style={audit.kpiGrid}>
          {[
            { icon: 'alert-circle',  label: 'BREACHES',    value: stats.failures, color: C.red,   sub: 'Thermal violations' },
            { icon: 'shield-check',  label: 'NEUTRALIZED', value: stats.handled,  color: C.accent, sub: 'Auto-mitigated' },
            { icon: 'thermometer',   label: 'AVG TEMP',    value: `${avgTemp}°C`, color: parseFloat(avgTemp) > 8 ? C.red : C.textPri, sub: 'Safe: 2–8°C' },
            { icon: 'note-text',     label: 'FIELD LOGS',  value: fieldLogs,      color: C.amber,  sub: 'Manual entries' },
          ].map((k, i) => (
            <View key={i} style={[audit.kpiCard, { borderColor: k.color + '25' }]}>
              <MaterialCommunityIcons name={k.icon} size={15} color={k.color} style={{ marginBottom: 6 }} />
              <Text style={audit.kpiLabel}>{k.label}</Text>
              <Text style={[audit.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={audit.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* System Health */}
        <SectionHeader label="System Health" />
        <View style={[gs.glassCard, { marginHorizontal: 20 }]}>
          <Text style={audit.chartTitle}>Performance metrics at a glance</Text>
          <Text style={audit.chartSub}>100% = perfect operation</Text>
          <View style={{ marginTop: 16 }}>
            <SimpleBarChart data={[
              { label: 'Cooling Efficiency', value: stats.efficiency, display: `${stats.efficiency}%`, color: stats.efficiency >= 90 ? C.accent : stats.efficiency >= 70 ? C.amber : C.red, note: `${stats.handled} of ${stats.failures} breach events resolved` },
              { label: 'System Uptime',      value: uptimeScore,      display: `${uptimeScore}%`,      color: C.blue,  note: 'Drops 2pts per unresolved breach' },
              { label: 'PCM Integrity',      value: pcmPct,           display: `${pcmPct}%`,           color: C.amber, note: `${pcmHealth} of ${units.length} units in safe zone` },
            ]} />
          </View>
        </View>

        {/* Unit temperatures */}
        {units.length > 0 && (
          <>
            <SectionHeader label="Unit Temperatures" />
            <View style={[gs.glassCard, { marginHorizontal: 20 }]}>
              <Text style={audit.chartTitle}>Live temperature per sensor unit</Text>
              <Text style={audit.chartSub}>Safe range: 2°C – 8°C</Text>
              <View style={{ marginTop: 16 }}>
                <SimpleBarChart data={units.map((u, i) => {
                  const t = parseFloat(u.temp);
                  return {
                    label: `Unit-${String(i+1).padStart(2,'0')}`,
                    value: t,
                    display: `${t.toFixed(1)}°C`,
                    color: t > 8 ? C.red : t > 6 ? C.amber : C.accent,
                    note: t > 8 ? 'BREACH — above safe ceiling' : t > 6 ? 'CAUTION — approaching limit' : 'STABLE — within safe zone',
                  };
                })} />
              </View>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                {[[C.accent,'Stable (≤6°C)'],[C.amber,'Caution (6–8°C)'],[C.red,'Breach (>8°C)']].map(([c, l]) => (
                  <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                    <Text style={{ color: C.textSec, fontSize: 10 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Risk */}
        <SectionHeader label="Risk Assessment" />
        <View style={[audit.riskCard, { borderColor: riskColor, backgroundColor: riskColor + '10', marginHorizontal: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={[audit.riskLevel, { color: riskColor }]}>RISK LEVEL: {riskLevel}</Text>
              <Text style={audit.riskDesc}>
                {riskLevel === 'HIGH'
                  ? 'Critical — immediate hardware inspection required before next transit phase.'
                  : riskLevel === 'MEDIUM'
                  ? 'Moderate — monitor closely and pre-cool units before next dispatch.'
                  : 'System is stable. No intervention required. Continue current protocols.'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={riskLevel === 'HIGH' ? 'alert-octagram' : riskLevel === 'MEDIUM' ? 'alert' : 'check-circle'}
              size={40} color={riskColor}
            />
          </View>
        </View>

        {/* Unit status list */}
        {units.length > 0 && (
          <>
            <SectionHeader label="Unit Status" />
            <View style={{ paddingHorizontal: 20 }}>
              {units.map((u, i) => {
                const t  = parseFloat(u.temp);
                const ok = t <= 8.0;
                const col = ok ? C.accent : C.red;
                return (
                  <View key={i} style={[audit.unitRow, { borderColor: col + '25' }]}>
                    <View style={[audit.unitDot, { backgroundColor: col }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={audit.unitName}>Unit-{String(i + 1).padStart(2, '0')}</Text>
                      <Text style={audit.unitMeta}>{ok ? 'PCM OPTIMAL' : 'PCM CRITICAL'} · {u.powerUsed || 'N/A'}% load</Text>
                    </View>
                    <Text style={[audit.unitTemp, { color: col }]}>{t.toFixed(1)}°C</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 12 }}>
          <TouchableOpacity
            style={[audit.exportBtn, generating && { opacity: 0.6 }, reportReady && { backgroundColor: '#00CC8E' }]}
            onPress={generateReport}
            disabled={generating}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={reportReady ? 'check' : 'file-chart'} size={18} color={C.bg} />
            <Text style={audit.exportText}>
              {reportReady ? 'REPORT SHARED ✓' : generating ? 'GENERATING PDF…' : 'GENERATE AUDIT REPORT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={audit.syncBtn} onPress={() => alert('Audit Data Synced to Corporate Database')}>
            <MaterialCommunityIcons name="cloud-upload" size={16} color={C.accent} />
            <Text style={audit.syncText}>SYNC TO CLOUD</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const audit = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, gap: 0 },
  kpiCard: { width: '48%', backgroundColor: C.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  kpiLabel: { color: C.textMute, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  kpiVal: { fontSize: 26, fontWeight: '900' },
  kpiSub: { color: C.textMute, fontSize: 9, marginTop: 4 },
  chartTitle: { color: C.textPri, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  chartSub: { color: C.textMute, fontSize: 10 },
  riskCard: { borderRadius: 16, padding: 20, borderWidth: 1.5 },
  riskLevel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  riskDesc: { color: C.textSec, fontSize: 12, lineHeight: 18 },
  unitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  unitDot: { width: 9, height: 9, borderRadius: 5 },
  unitName: { color: C.textPri, fontSize: 13, fontWeight: '700' },
  unitMeta: { color: C.textMute, fontSize: 10, marginTop: 2 },
  unitTemp: { fontSize: 16, fontWeight: '900' },
  exportBtn: { backgroundColor: C.accent, padding: 17, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  exportText: { color: C.bg, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  syncBtn: { padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '30' },
  syncText: { color: C.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});

// ═══════════════════════════════════════════════════════════════
// SHARED HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════
const Header = ({ title, right }) => (
  <View style={gs.header}>
    <View style={gs.headerLeft}>
      <MaterialCommunityIcons name="snowflake" size={18} color={C.accent} style={{ marginRight: 6 }} />
      <Text style={gs.headerTitle}>{title}</Text>
    </View>
    {right || null}
  </View>
);

// ═══════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════
const gs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 58, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: C.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: C.accent, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  pageEyebrow: { color: C.textMute, fontSize: 11, fontWeight: '800', letterSpacing: 3.5, marginBottom: 4 },
  pageTitle: { color: C.textPri, fontSize: 44, fontWeight: '900', letterSpacing: -1, lineHeight: 46 },
  accentBar: { width: 32, height: 3, backgroundColor: C.accent, borderRadius: 2, marginTop: 10, marginBottom: 14 },
  pageSub: { color: C.textSec, fontSize: 13, lineHeight: 20 },
  glassCard: { backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 0 },
  cardLabel: { color: C.textMute, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  bodyText: { color: C.textSec, fontSize: 13, lineHeight: 21 },
  statBig: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: C.textPri, fontSize: 12, fontWeight: '700', marginTop: 2 },
  statSub: { color: C.textMute, fontSize: 10, marginTop: 2 },
  solRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  solIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  solText: { flex: 1, color: C.textPri, fontSize: 13, fontWeight: '600' },
  quote: { color: C.textMute, fontStyle: 'italic', textAlign: 'center', marginVertical: 36, paddingHorizontal: 40, fontSize: 12, lineHeight: 18 },
});

// ═══════════════════════════════════════════════════════════════
// ROOT NAV
// ═══════════════════════════════════════════════════════════════
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) return <AuthScreen onAuth={(u) => setUser(u)} />;

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            height: 76,
            paddingBottom: 18,
            paddingTop: 8,
          },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.textMute,
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
        }}
      >
        <Tab.Screen name="Home" options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-variant" size={24} color={color} /> }}>
          {({ navigation }) => <HubScreen navigation={navigation} user={user} onSignOut={() => setUser(null)} />}
        </Tab.Screen>
        <Tab.Screen name="Units" component={UnitsScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-grid" size={24} color={color} /> }} />
        <Tab.Screen name="Transit" options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="radar" size={24} color={color} /> }}>
          {() => <TransitScreen trackingId={user.trackingId} role={user.role} />}
        </Tab.Screen>
        <Tab.Screen name="Audit" component={AuditScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="file-chart" size={24} color={color} /> }} />
        <Tab.Screen name="Mission" component={MissionScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="shield-check" size={24} color={color} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
