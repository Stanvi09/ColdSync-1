import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, 
  TouchableOpacity, Modal, TextInput, StatusBar,
  Dimensions, Animated, Platform
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- FIREBASE CONFIG ---
import { ref, onValue, push, set } from 'firebase/database';
import { db } from './firebaseConfig'; 

// --- SHARED COMPONENTS ---
const PowerRing = ({ percentage, color }) => (
  <View style={styles.ringOutline}>
    <View style={[styles.ringFill, { height: `${percentage}%`, backgroundColor: color, top: `${100 - percentage}%` }]} />
    <Text style={styles.ringText}>{percentage}%</Text>
  </View>
);

// --- AUTH SCREEN (Login + Signup) ---
function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [trackId, setTrackId]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = () => {
    setError('');
    if (mode === 'signup') {
      if (!name.trim())         return setError('Please enter your full name.');
      if (!email.includes('@')) return setError('Enter a valid email address.');
      if (password.length < 6)  return setError('Password must be at least 6 characters.');
      if (!trackId.trim())      return setError('Please enter your Tracking ID.');
    } else {
      if (!email.includes('@')) return setError('Enter a valid email address.');
      if (!password.trim())     return setError('Please enter your password.');
      if (!trackId.trim())      return setError('Please enter your Tracking ID.');
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuth({ name: name || email.split('@')[0], trackingId: trackId.toUpperCase() });
    }, 800);
  };

  return (
    <ScrollView contentContainerStyle={authStyles.screen} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" />

      <View style={authStyles.logoBlock}>
        <View style={authStyles.logoIconRing}>
          <MaterialCommunityIcons name="snowflake" size={32} color="#00FFAD" />
        </View>
        <Text style={authStyles.logoText}>ColdSync</Text>
        <Text style={authStyles.logoSub}>RVCE INNOVATION LAB</Text>
      </View>

      <View style={authStyles.card}>
        <View style={authStyles.tabRow}>
          <TouchableOpacity style={[authStyles.tab, mode === 'login' && authStyles.tabActive]} onPress={() => { setMode('login'); setError(''); }}>
            <Text style={[authStyles.tabText, mode === 'login' && authStyles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[authStyles.tab, mode === 'signup' && authStyles.tabActive]} onPress={() => { setMode('signup'); setError(''); }}>
            <Text style={[authStyles.tabText, mode === 'signup' && authStyles.tabTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={authStyles.cardHeading}>{mode === 'login' ? 'Welcome' : 'Join ColdSync'}</Text>
        <Text style={authStyles.cardSub}>{mode === 'login' ? 'Sign in to monitor your cold chain in real-time.' : 'Create your operator account to get started.'}</Text>

        {mode === 'signup' && (
          <View style={authStyles.fieldGroup}>
            <Text style={authStyles.fieldLabel}>FULL NAME</Text>
            <View style={authStyles.inputRow}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#495670" style={authStyles.inputIcon} />
              <TextInput style={authStyles.input} placeholder="Dr. Tanvi Sharma" placeholderTextColor="#2E3D55" value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          </View>
        )}

        <View style={authStyles.fieldGroup}>
          <Text style={authStyles.fieldLabel}>EMAIL ADDRESS</Text>
          <View style={authStyles.inputRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color="#495670" style={authStyles.inputIcon} />
            <TextInput style={authStyles.input} placeholder="operator@coldsync.in" placeholderTextColor="#2E3D55" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        <View style={authStyles.fieldGroup}>
          <Text style={authStyles.fieldLabel}>PASSWORD</Text>
          <View style={authStyles.inputRow}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#495670" style={authStyles.inputIcon} />
            <TextInput style={[authStyles.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor="#2E3D55" value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ paddingHorizontal: 12 }}>
              <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#495670" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={authStyles.fieldGroup}>
          <Text style={authStyles.fieldLabel}>SHIPMENT TRACKING ID</Text>
          <View style={authStyles.inputRow}>
            <MaterialCommunityIcons name="barcode-scan" size={18} color="#495670" style={authStyles.inputIcon} />
            <TextInput style={authStyles.input} placeholder="e.g. CS-RVCE-01" placeholderTextColor="#2E3D55" value={trackId} onChangeText={setTrackId} autoCapitalize="characters" />
          </View>
          <Text style={authStyles.fieldHint}>This links your session to an active shipment.</Text>
        </View>

        {!!error && (
          <View style={authStyles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FF4D4D" />
            <Text style={authStyles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={[authStyles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          <MaterialCommunityIcons name={mode === 'login' ? 'login' : 'account-plus'} size={18} color="#020C1B" />
          <Text style={authStyles.submitText}>{loading ? 'AUTHENTICATING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} style={{ marginTop: 18, alignItems: 'center' }}>
          <Text style={authStyles.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <Text style={{ color: '#00FFAD', fontWeight: '700' }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={authStyles.footer}>Authorized Personnel Only · RVCE Innovation Lab</Text>
    </ScrollView>
  );
}

// --- MISSION PAGE ---

function MissionScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.mainLogoText}>ColdSync</Text>
        <View style={styles.rvBadge}><Text style={styles.rvText}>RVCE INNOVATION</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollArea}>

        {/* HERO */}
        <View style={styles.welcomeHeader}>
          <Text style={styles.grandWelcomeText}>ABOUT COLDSYNC</Text>
          <Text style={[styles.brandTitleText, {fontSize: 38, lineHeight: 44}]}>
            Keeping{"\n"}<Text style={{color: '#00FFAD'}}>life-saving</Text>{"\n"}medicines cold.
          </Text>
          <View style={styles.accentLine} />
          <Text style={styles.heroSubtitle}>
            An IoT-powered cold chain intelligence platform that monitors vaccines and biologics in real-time — from warehouse to last-mile delivery.
          </Text>
        </View>

        {/* THE PROBLEM */}
        <Text style={styles.sectionTitle}>The Problem We Solve</Text>
        <View style={[styles.missionDarkCard, {borderColor: '#FF6B6B30', marginBottom: 8}]}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10}}>
            <MaterialCommunityIcons name="alert-octagram" size={18} color="#FF6B6B" />
            <Text style={{color: '#FF6B6B', fontSize: 11, fontWeight: '800', letterSpacing: 1}}>COLD CHAIN FAILURE IS A GLOBAL HEALTHCARE CRISIS</Text>
          </View>
          <Text style={styles.aboutText}>
            Every year, <Text style={{color:'#FFF', fontWeight:'700'}}>up to 50% of all vaccines are wasted globally</Text> — not due to disease, but due to temperature excursions during storage and transit. In India alone, cold chain failures cost the healthcare system <Text style={{color:'#FFF', fontWeight:'700'}}>billions of rupees annually</Text>, silently undermining immunization programs.{"\n\n"}
            The root cause: <Text style={{color:'#FFF', fontWeight:'700'}}>no real-time visibility</Text>. Shipments travel blind. By the time a breach is detected, damage is already done.
          </Text>
        </View>
        <View style={styles.challengeRow}>
          <View style={styles.challengeCard}>
            <MaterialCommunityIcons name="alert-octagram" size={24} color="#FF6B6B" />
            <Text style={[styles.challengeStat, {color:'#FF6B6B'}]}>50%</Text>
            <Text style={styles.challengeLabel}>Vaccine Waste Rate</Text>
          </View>
          <View style={styles.challengeCard}>
            <MaterialCommunityIcons name="currency-inr" size={24} color="#FFB347" />
            <Text style={[styles.challengeStat, {color:'#FFB347'}]}>₹35 Billion+</Text>
            <Text style={styles.challengeLabel}>Annual Losses (India)</Text>
          </View>
        </View>

        {/* WHAT IS COLDSYNC */}
        <Text style={styles.sectionTitle}>Our Solution</Text>
        <View style={[styles.missionDarkCard, {borderColor: '#00FFAD30'}]}>
          <Text style={[styles.hubGreeting, {marginBottom: 10}]}>What is ColdSync?</Text>
          <Text style={styles.aboutText}>
            ColdSync is an <Text style={{color:'#FFF', fontWeight:'700'}}>ESP32-based IoT monitoring system</Text> that attaches to cold-chain shipment boxes and streams live temperature, humidity, and battery data to a cloud dashboard in real-time.{"\n\n"}
            When a temperature breach occurs, ColdSync <Text style={{color:'#FFF', fontWeight:'700'}}>automatically detects it, triggers hardware mitigation</Text> (activating cooling fans and PCM phase-change material systems), and logs a timestamped alert — creating a full chain-of-custody audit trail visible to every stakeholder.
          </Text>
        </View>

        {/* HOW IT WORKS */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.solutionList}>
          {[
            { num: '01', icon: 'cpu-64-bit',       title: 'Hardware Sensors on Every Box',      sub: 'ESP32 + DHT22 sensors stream temperature & humidity to Firebase every few seconds.' },
            { num: '02', icon: 'bell-alert',        title: 'Intelligent Breach Detection',       sub: 'Exceeding 8°C triggers an instant alert, fan activation, and PCM mitigation — automatically.' },
            { num: '03', icon: 'monitor-dashboard', title: 'Live Dashboard for Operators',       sub: 'Mobile app shows unit health, PCM state, battery load, and a full event timeline.' },
            { num: '04', icon: 'file-chart',        title: 'Automated Audit Reports',            sub: 'One tap generates a compliance-ready PDF with breach stats, risk levels, and custody logs.' },
          ].map((item, i) => (
            <View key={i} style={[styles.solRow, {alignItems:'flex-start', marginBottom: 18, paddingBottom: 18, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#1E293B'}]}>
              <View style={{width: 28, height: 28, borderRadius: 8, backgroundColor: '#112240', borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2}}>
                <Text style={{color:'#00FFAD', fontSize:10, fontWeight:'900'}}>{item.num}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:'#FFF', fontSize:13, fontWeight:'800', marginBottom: 4}}>{item.title}</Text>
                <Text style={{color:'#8892B0', fontSize:12, lineHeight:18}}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* IMPACT */}
        <Text style={styles.sectionTitle}>Impact at a Glance</Text>
        <View style={[styles.challengeRow, {flexWrap:'wrap', gap: 10}]}>
          {[
            {label:'Detection', val:'Real-time\nAlerts',    color:'#00FFAD'},
            {label:'Response',  val:'Auto\nMitigation',     color:'#4285F4'},
            {label:'Tracing',   val:'Full Audit\nTrail',    color:'#FFB347'},
            {label:'Coverage',  val:'Multi-box\nTracking',  color:'#FF6B6B'},
          ].map((item,i) => (
            <View key={i} style={[styles.challengeCard, {width:'47%'}]}>
              <Text style={styles.challengeLabel}>{item.label}</Text>
              <Text style={[styles.challengeStat, {color: item.color, fontSize: 16, marginVertical: 4}]}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* VISION */}
        <Text style={styles.sectionTitle}>Our Vision</Text>
        <View style={[styles.missionDarkCard, {borderColor: '#4285F430'}]}>
          <View style={{backgroundColor:'#4285F412', borderWidth:1, borderColor:'#4285F430', borderRadius:6, paddingHorizontal:10, paddingVertical:4, alignSelf:'flex-start', marginBottom:14}}>
            <Text style={{color:'#4285F4', fontSize:9, fontWeight:'800', letterSpacing:2}}>LONG-TERM IMPACT</Text>
          </View>
          <Text style={styles.aboutText}>
            We envision a future where <Text style={{color:'#FFF', fontWeight:'700'}}>every vaccine, biologic, and temperature-sensitive medicine</Text> reaches its destination with its potency intact — regardless of geography, infrastructure, or logistical complexity.{"\n\n"}
            ColdSync is not just a monitoring tool. It is <Text style={{color:'#FFF', fontWeight:'700'}}>the trust infrastructure for healthcare logistics</Text> — ensuring that the last mile, often the most vulnerable, is finally as accountable as the first.
          </Text>
        </View>

        <Text style={styles.visionQuote}>
          "Revolutionizing global healthcare through precision cold chain intelligence — built at RVCE, designed for the world."
        </Text>

      </ScrollView>
    </View>
  );
}

// --- HUB SCREEN ---
function HubScreen({ navigation, user, onSignOut }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.mainLogoText}>ColdSync</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutBtn}>
          <MaterialCommunityIcons name="logout" size={16} color="#FF4D4D" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollArea}>
        <View style={styles.welcomeHeader}>
          <Text style={styles.grandWelcomeText}>WELCOME BACK</Text>
          <Text style={styles.brandTitleText}>{(user?.name || 'Operator').toUpperCase()}</Text>
          <View style={styles.accentLine} />
          <View style={styles.trackingPill}>
            <MaterialCommunityIcons name="barcode-scan" size={13} color="#00FFAD" />
            <Text style={styles.trackingPillText}>{user?.trackingId || 'CS-RVCE-01'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.hubNavBox} onPress={() => navigation.navigate('Units')}>
          <View style={styles.hubIconCircle}><MaterialCommunityIcons name="view-grid" size={32} color="#00FFAD" /></View>
          <View style={styles.hubNavContent}><Text style={styles.hubNavTitle}>Asset Telemetry</Text><Text style={styles.hubNavSub}>Monitor box health & diagnostics.</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#495670" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.hubNavBox} onPress={() => navigation.navigate('Transit')}>
          <View style={[styles.hubIconCircle, {borderColor: '#4285F4'}]}><MaterialCommunityIcons name="radar" size={32} color="#4285F4" /></View>
          <View style={styles.hubNavContent}><Text style={styles.hubNavTitle}>Live Transit</Text><Text style={styles.hubNavSub}>Track shipment & logs.</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#495670" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.hubNavBox} onPress={() => navigation.navigate('Mission')}>
          <View style={[styles.hubIconCircle, {borderColor: '#FFF'}]}><MaterialCommunityIcons name="information-variant" size={32} color="#FFF" /></View>
          <View style={styles.hubNavContent}><Text style={styles.hubNavTitle}>Our Mission</Text><Text style={styles.hubNavSub}>About ColdSync Initiative.</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#495670" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// --- UNITS SCREEN ---
function UnitsScreen() {
  const [selectedBox, setSelectedBox] = useState(null);
  const [liveBoxes, setLiveBoxes] = useState([]);
  const systemState = useRef({}); 

  const pushLog = (unitId, temp, type) => {
    if (systemState.current[unitId] === type) return;

    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef); 
    
    let logEntry = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: "HARDWARE_SENSOR",
      status: "active"
    };

    if (type === 'BREACH') {
      logEntry.title = "CRITICAL TEMP ALERT";
      logEntry.desc = `Sensor ${unitId} detected ${temp}°C. Hardware mitigation engaged.`;
    } else if (type === 'STABLE') {
      logEntry.title = "SYSTEM STABILIZED";
      logEntry.desc = `Sensor ${unitId} recovered to ${temp}°C. Safety bounds restored.`;
    }

    set(newLogRef, logEntry);
    systemState.current[unitId] = type;
  };

  useEffect(() => {
    // REVISED: Listening to 'units' folder which matches your ESP32 upload path
    const boxesRef = ref(db, 'units');
    const unsubscribe = onValue(boxesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedData = Object.keys(data).map(key => {
          const box = data[key];
          const currentTemp = parseFloat(box.temp);

          // Real-time Logic Trigger
          if (currentTemp > 8.0) {
            pushLog(key, currentTemp, 'BREACH');
          } else if (currentTemp <= 8.0 && systemState.current[key] === 'BREACH') {
            pushLog(key, currentTemp, 'STABLE');
          }

          return { id: key, ...box };
        });
        setLiveBoxes(formattedData);
      } else {
        setLiveBoxes([]); // Prevents UI hanging if db is cleared
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.mainLogoText}>ColdSync</Text>
        <View style={styles.liveBadge}><View style={styles.pulse} /><Text style={styles.liveText}>SENSOR LIVE</Text></View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollArea}>
        <Text style={styles.sectionTitle}>Inventory Health</Text>
        <View style={styles.gridRow}>
          {liveBoxes.length === 0 ? (
            <Text style={[styles.heroSubtitle, {paddingHorizontal: 20}]}>Searching for active telemetry...</Text>
          ) : (
            liveBoxes.map((box) => (
              <TouchableOpacity 
                  key={box.id} 
                  onPress={() => setSelectedBox(box)}
                  style={[styles.boxCardFancy, { borderColor: box.temp > 8.0 ? '#FF4D4D' : '#00FFAD40' }]}
              >
                <View style={[styles.boxTitleWrapper, {backgroundColor: box.temp > 8.0 ? '#FF4D4D20' : '#112240'}]}>
                  <Text style={styles.boxTitleText}>{box.id.toUpperCase()}</Text>
                </View>
                <View style={styles.tempContainer}>
                  <Text style={[styles.bigTemp, { color: box.temp > 8.0 ? '#FF4D4D' : '#00FFAD' }]}>{box.temp}°C</Text>
                  <Text style={[styles.statusMini, {color: box.temp > 8.0 ? '#FF4D4D' : '#00FFAD'}]}>{box.temp > 8.0 ? 'BREACH' : 'STABLE'}</Text>
                </View>
                <View style={[styles.detailsBtn, {backgroundColor: box.temp > 8.0 ? '#FF4D4D' : '#00FFAD20'}]}><Text style={styles.detailsBtnText}>HARDWARE FEED</Text></View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedBox} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardFancy}>
            <Text style={styles.modalTitle}>SENSORS: {selectedBox?.id}</Text>
            <View style={styles.graphContainer}>
                <View style={styles.graphItem}>
                    <PowerRing percentage={selectedBox?.powerUsed || 0} color={selectedBox?.temp > 8.0 ? '#FF4D4D' : '#4285F4'} />
                    <Text style={styles.graphLabel}>BATTERY LOAD</Text>
                </View>
                <View style={styles.graphItem}>
                    <PowerRing percentage={100 - (selectedBox?.powerUsed || 0)} color="#00FFAD" />
                    <Text style={styles.graphLabel}>LIFE LEFT</Text>
                </View>
            </View>
            <View style={styles.diagGrid}>
                <View style={styles.diagItem}><Text style={styles.mKey}>TEMP</Text><Text style={styles.mVal}>{selectedBox?.temp}°C</Text></View>
                <View style={styles.diagItem}><Text style={styles.mKey}>HUMIDITY</Text><Text style={styles.mVal}>{selectedBox?.humidity || '45%'}</Text></View>
                <View style={styles.diagItem}><Text style={styles.mKey}>PCM STATE</Text><Text style={styles.mVal}>{selectedBox?.temp > 8.0 ? 'CRITICAL' : 'OPTIMAL'}</Text></View>
                <View style={styles.diagItem}><Text style={styles.mKey}>COOLING FAN</Text><Text style={styles.mVal}>{selectedBox?.temp > 8.0 ? 'ACTIVE' : 'IDLE'}</Text></View>
            </View>
            <TouchableOpacity style={styles.closeBtnFancy} onPress={() => setSelectedBox(null)}><Text style={styles.closeBtnTextFancy}>CLOSE SYSTEM VIEW</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

// --- TRANSIT PAGE ---
function TransitScreen({ trackingId }) {
  const [remarks, setRemarks] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const logsRef = ref(db, 'logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedLogs = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).reverse(); 
        setLogs(formattedLogs);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddLog = () => {
    if (remarks.trim() === "") return;
    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef);
    set(newLogRef, { 
      title: 'FIELD LOG ENTRY', 
      desc: remarks, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      user: 'USER_AUTH', 
      status: 'active' 
    });
    setRemarks("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}><Text style={styles.mainLogoText}>ColdSync</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.transitBody}>
        <View style={styles.etaCardFancy}>
          <View><Text style={styles.metLabel}>ESTIMATED ARRIVAL</Text><Text style={styles.etaTime}>Today, 14:30 IST</Text></View>
          <MaterialCommunityIcons name="clock-fast" size={32} color="#00FFAD" />
        </View>
        <View style={styles.assetHeaderCardFancy}>
          <Text style={styles.assetSub}>ASSET TRACKING ID</Text>
          <Text style={styles.assetMain}>{trackingId || "CS-RVCE-01"}</Text>
          <View style={styles.divider} />
          <View style={styles.assetMetricsRow}>
            <View><Text style={styles.metLabel}>STATUS</Text><Text style={styles.metVal}>IN-TRANSIT</Text></View>
            <View><Text style={styles.metLabel}>DESTINATION</Text><Text style={styles.metVal}>RVCE CAMPUS</Text></View>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Chain of Custody Logs</Text>
        <View style={styles.timelineCard}>
          {logs.map((step, index) => (
            <View key={step.id || index} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: step.title === 'CRITICAL TEMP ALERT' ? '#FF4D4D' : '#00FFAD' }]} />
                {index !== logs.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineRight}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, {color: step.title === 'CRITICAL TEMP ALERT' ? '#FF4D4D' : '#FFF'}]}>{step.title}</Text>
                  <Text style={styles.stepUser}>[{step.user}]</Text>
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
                <Text style={styles.stepTime}>{step.time}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.feedbackCard}>
          <Text style={styles.cardTitle}>Add Field Log Entry</Text>
          <TextInput style={styles.remarksInput} placeholder="Type log details..." placeholderTextColor="#495670" multiline value={remarks} onChangeText={setRemarks} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleAddLog}><Text style={styles.submitBtnText}>UPDATE TIMELINE</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// --- SIMPLE LABELED BAR CHART ---
const SimpleBarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 12 }}>
      {data.map((item, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#8892B0', fontSize: 11, fontWeight: '600', flex: 1 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 11, fontWeight: '800', marginLeft: 8 }}>{item.display}</Text>
          </View>
          <View style={{ height: 10, backgroundColor: '#112240', borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color, borderRadius: 5 }} />
          </View>
          {item.note ? <Text style={{ color: '#495670', fontSize: 9, marginTop: 3 }}>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  );
};

// --- AUDIT SCREEN ---
function AuditScreen() {
  const [stats, setStats]       = useState({ failures: 0, handled: 0, efficiency: 100 });
  const [avgTemp, setAvgTemp]   = useState(0);
  const [allLogs, setAllLogs]   = useState([]);
  const [units, setUnits]       = useState([]);
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
        const breaches  = logArray.filter(l => l.title === "CRITICAL TEMP ALERT").length;
        const mitigated = logArray.filter(l => l.title === "SYSTEM STABILIZED").length;
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

  // Simple risk: based on failure count vs handled
  const riskLevel = stats.failures === 0 ? 'LOW' : stats.efficiency < 70 ? 'HIGH' : 'MEDIUM';
  const riskColor = riskLevel === 'HIGH' ? '#FF4D4D' : riskLevel === 'MEDIUM' ? '#FFB347' : '#00FFAD';

  // --- PDF Report ---
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
        // On web, open the clean HTML report in a new tab so only report content is printed
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
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.mainLogoText}>ColdSync</Text>
        <View style={styles.auditBadge}><Text style={styles.auditBadgeText}>LIVE AUDIT</Text></View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollArea, { paddingBottom: 50 }]}>

        {/* Page title */}
        <View style={styles.welcomeHeader}>
          <Text style={styles.grandWelcomeText}>REAL-TIME</Text>
          <Text style={styles.brandTitleText}>AUDIT</Text>
          <View style={styles.accentLine} />
          <Text style={styles.heroSubtitle}>Live diagnostics from your active shipment</Text>
        </View>

        {/* 4 KPI cards */}
        <View style={styles.auditGrid}>
          <View style={[styles.statCard, { borderColor: '#FF4D4D30' }]}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#FF4D4D" style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>BREACHES</Text>
            <Text style={[styles.statValue, { color: '#FF4D4D' }]}>{stats.failures}</Text>
            <Text style={styles.statFooter}>Thermal violations</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#00FFAD30' }]}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#00FFAD" style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>NEUTRALIZED</Text>
            <Text style={[styles.statValue, { color: '#00FFAD' }]}>{stats.handled}</Text>
            <Text style={styles.statFooter}>Auto-mitigated</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#4285F430' }]}>
            <MaterialCommunityIcons name="thermometer" size={16} color="#4285F4" style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>AVG TEMP</Text>
            <Text style={[styles.statValue, { color: parseFloat(avgTemp) > 8 ? '#FF4D4D' : '#FFF' }]}>{avgTemp}°C</Text>
            <Text style={styles.statFooter}>Safe: 2–8°C</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#FFB34730' }]}>
            <MaterialCommunityIcons name="note-text" size={16} color="#FFB347" style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>FIELD LOGS</Text>
            <Text style={[styles.statValue, { color: '#FFB347' }]}>{fieldLogs}</Text>
            <Text style={styles.statFooter}>Manual entries</Text>
          </View>
        </View>

        {/* CHART 1 — System Health (3 bars, clearly labeled) */}
        <View style={styles.auditSection}>
          <Text style={styles.sectionTitle}>SYSTEM HEALTH</Text>
          <View style={styles.chartCard}>
            <Text style={auditChartStyles.chartTitle}>How well is the system performing?</Text>
            <Text style={auditChartStyles.chartSub}>Each bar shows a % score — 100% is perfect.</Text>
            <View style={{ marginTop: 16 }}>
              <SimpleBarChart data={[
                { label: 'Cooling Efficiency — how often breaches were fixed', value: stats.efficiency, display: `${stats.efficiency}%`, color: stats.efficiency >= 90 ? '#00FFAD' : stats.efficiency >= 70 ? '#FFB347' : '#FF4D4D', note: `${stats.handled} of ${stats.failures} breach events resolved` },
                { label: 'System Uptime — time spent in stable operation',      value: uptimeScore,       display: `${uptimeScore}%`,       color: '#4285F4', note: 'Drops 2pts per unresolved breach' },
                { label: 'PCM Integrity — units within safe 2–8°C range',       value: pcmPct,            display: `${pcmPct}%`,            color: '#FFB347', note: `${pcmHealth} of ${units.length} units in safe zone` },
              ]} />
            </View>
          </View>
        </View>

        {/* CHART 2 — Per-unit temperatures (only shown when units exist) */}
        {units.length > 0 && (
          <View style={styles.auditSection}>
            <Text style={styles.sectionTitle}>UNIT TEMPERATURES</Text>
            <View style={styles.chartCard}>
              <Text style={auditChartStyles.chartTitle}>Live temperature per sensor unit</Text>
              <Text style={auditChartStyles.chartSub}>Safe range is 2°C – 8°C. Red = above safe ceiling.</Text>
              <View style={{ marginTop: 16 }}>
                <SimpleBarChart data={units.map((u, i) => {
                  const t = parseFloat(u.temp);
                  return {
                    label: `Unit-${String(i+1).padStart(2,'0')}`,
                    value: t,
                    display: `${t.toFixed(1)}°C`,
                    color: t > 8 ? '#FF4D4D' : t > 6 ? '#FFB347' : '#00FFAD',
                    note: t > 8 ? 'BREACH — above safe ceiling' : t > 6 ? 'CAUTION — approaching limit' : 'STABLE — within safe zone',
                  };
                })} />
              </View>
              {/* Legend */}
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                {[['#00FFAD','Stable (≤6°C)'],['#FFB347','Caution (6–8°C)'],['#FF4D4D','Breach (>8°C)']].map(([c,l]) => (
                  <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                    <Text style={{ color: '#8892B0', fontSize: 10 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Risk banner */}
        <View style={styles.auditSection}>
          <Text style={styles.sectionTitle}>RISK ASSESSMENT</Text>
          <View style={[auditChartStyles.riskCard, { borderColor: riskColor, backgroundColor: riskColor + '12' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[auditChartStyles.riskLevel, { color: riskColor }]}>RISK LEVEL: {riskLevel}</Text>
                <Text style={auditChartStyles.riskDesc}>
                  {riskLevel === 'HIGH'
                    ? 'Critical — immediate hardware inspection required before next transit phase.'
                    : riskLevel === 'MEDIUM'
                    ? 'Moderate — monitor closely and pre-cool units before next dispatch.'
                    : 'System is stable. No intervention required. Continue current protocols.'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={riskLevel === 'HIGH' ? 'alert-octagram' : riskLevel === 'MEDIUM' ? 'alert' : 'check-circle'}
                size={40} color={riskColor} style={{ marginLeft: 12 }}
              />
            </View>
          </View>
        </View>

        {/* Unit status list */}
        {units.length > 0 && (
          <View style={styles.auditSection}>
            <Text style={styles.sectionTitle}>UNIT STATUS</Text>
            {units.map((u, i) => {
              const t = parseFloat(u.temp);
              const ok = t <= 8.0;
              return (
                <View key={i} style={[styles.unitRow, { borderColor: ok ? '#00FFAD20' : '#FF4D4D30' }]}>
                  <View style={[styles.unitDot, { backgroundColor: ok ? '#00FFAD' : '#FF4D4D' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitName}>Unit-{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={styles.unitMeta}>{ok ? 'PCM OPTIMAL' : 'PCM CRITICAL'} · {u.powerUsed || 'N/A'}% load</Text>
                  </View>
                  <Text style={[styles.unitTemp, { color: ok ? '#00FFAD' : '#FF4D4D' }]}>{t.toFixed(1)}°C</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Generate Report */}
        <TouchableOpacity
          style={[styles.exportBtn, generating && { opacity: 0.7 }, reportReady && { backgroundColor: '#00CC8E' }]}
          onPress={generateReport}
          disabled={generating}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name={reportReady ? 'check' : 'file-chart'} size={20} color="#020C1B" />
          <Text style={styles.exportBtnText}>
            {reportReady ? 'REPORT SHARED ✓' : generating ? 'GENERATING PDF...' : 'GENERATE AUDIT REPORT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.syncBtn} onPress={() => alert('Audit Data Synced to Corporate Database')}>
          <MaterialCommunityIcons name="cloud-upload" size={18} color="#00FFAD" />
          <Text style={styles.syncBtnText}>SYNC TO CLOUD</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// --- MAIN NAVIGATION AND APP ENTRY ---
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null); // { name, trackingId }

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabStyle,
          tabBarActiveTintColor: '#00FFAD',
          tabBarInactiveTintColor: '#495670',
        }}
      >
        <Tab.Screen name="Home" options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="home-variant" size={24} color={color} /> }}>
          {({ navigation }) => <HubScreen navigation={navigation} user={user} onSignOut={() => setUser(null)} />}
        </Tab.Screen>
        <Tab.Screen name="Units" component={UnitsScreen} options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="view-grid" size={24} color={color} /> }} />
        <Tab.Screen name="Transit" options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="radar" size={24} color={color} /> }}>
          {() => <TransitScreen trackingId={user.trackingId} />}
        </Tab.Screen>
        <Tab.Screen name="Audit" component={AuditScreen} options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="file-chart" size={24} color={color} /> }} />
        <Tab.Screen name="Mission" component={MissionScreen} options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="shield-check" size={24} color={color} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1B' },
  headerBar: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#0A192F', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#112240' },
  mainLogoText: { color: '#00FFAD', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  scrollArea: { paddingBottom: 30 },
  welcomeHeader: { marginTop: 40, marginBottom: 40, paddingHorizontal: 20 },
  grandWelcomeText: { color: '#8892B0', fontSize: 14, fontWeight: 'bold', letterSpacing: 3 },
  brandTitleText: { color: '#FFF', fontSize: 48, fontWeight: '900', letterSpacing: 1 },
  accentLine: { width: 40, height: 4, backgroundColor: '#00FFAD', marginTop: 12 },
  heroSubtitle: { color: '#8892B0', fontSize: 14, marginTop: 15, lineHeight: 22 },
  gridRow: { flexDirection: 'row',justifyContent: 'space-between',paddingHorizontal: 20,},
  challengeRow: { flexDirection: 'row',justifyContent: 'space-between',marginHorizontal: 20,},
  boxCardFancy: { width: '47%', backgroundColor: '#0A192F', borderRadius: 16, borderWidth: 1.5, height: 190, marginBottom: 15, justifyContent: 'space-between', overflow: 'hidden', elevation: 10 },
  boxTitleWrapper: { padding: 12 },
  boxTitleText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
  tempContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bigTemp: { fontSize: 28, fontWeight: '900' },
  statusMini: { fontSize: 8, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  detailsBtn: { padding: 14 },
  detailsBtnText: { color: '#FFF', fontSize: 8, textAlign: 'center', fontWeight: '900', letterSpacing: 0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#112240', padding: 6, borderRadius: 8 },
  liveText: { color: '#00FFAD', fontSize: 10, fontWeight: 'bold' },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FFAD', marginRight: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 12, 27, 0.95)', justifyContent: 'center', padding: 20 },
  modalCardFancy: { backgroundColor: '#0A192F', padding: 30, borderRadius: 32, borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 15, letterSpacing: 1 },
  graphContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  graphItem: { alignItems: 'center' },
  graphLabel: { color: '#8892B0', fontSize: 8, fontWeight: '900', marginTop: 10 },
  ringOutline: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#020C1B', overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: '#1E293B' },
  ringFill: { width: '100%', position: 'absolute' },
  ringText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, width: '100%', textAlign: 'center', marginBottom: 25 },
  diagGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  diagItem: { width: '48%', backgroundColor: '#112240', padding: 15, borderRadius: 12, marginBottom: 10 },
  mKey: { color: '#8892B0', fontSize: 9, fontWeight: 'bold' },
  mVal: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  closeBtnFancy: { backgroundColor: '#00FFAD', padding: 18, borderRadius: 12, marginTop: 20 },
  closeBtnTextFancy: { textAlign: 'center', fontWeight: '900', color: '#020C1B', fontSize: 12, letterSpacing: 1 },
  transitBody: { flex: 1, padding: 20 },
  etaCardFancy: { backgroundColor: '#00FFAD08', padding: 25, borderRadius: 24, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#00FFAD30' },
  etaTime: { color: '#00FFAD', fontSize: 24, fontWeight: '900' },
  assetHeaderCardFancy: { backgroundColor: '#112240', padding: 25, borderRadius: 24, marginBottom: 10 },
  assetSub: { color: '#8892B0', fontSize: 10, fontWeight: 'bold' },
  assetMain: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 15 },
  assetMetricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metLabel: { color: '#495670', fontSize: 9, fontWeight: 'bold' },
  metVal: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 3 },
  timelineCard: { backgroundColor: '#0A192F', padding: 20, borderRadius: 20, marginBottom: 25 },
  timelineRow: { flexDirection: 'row', minHeight: 80 },
  timelineLeft: { alignItems: 'center', marginRight: 15 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 1, flex: 1, backgroundColor: '#1E293B' },
  timelineRight: { flex: 1 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stepTitle: { fontSize: 13, fontWeight: '900', color: '#FFF' },
  stepUser: { color: '#4285F4', fontSize: 8, fontWeight: 'bold' },
  stepDesc: { color: '#8892B0', fontSize: 11, marginTop: 4 },
  stepTime: { color: '#495670', fontSize: 10, marginTop: 4 },
  feedbackCard: { backgroundColor: '#112240', padding: 20, borderRadius: 20, marginBottom: 30 },
  cardTitle: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  remarksInput: { backgroundColor: '#020C1B', borderRadius: 12, height: 60, padding: 15, color: '#FFF', marginBottom: 15, fontSize: 12 },
  submitBtn: { backgroundColor: '#00FFAD', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#020C1B', fontWeight: '900', fontSize: 12 },
  tabStyle: { backgroundColor: '#0A192F', borderTopColor: '#112240', height: 80, paddingBottom: 20 },
  hubNavBox: { backgroundColor: '#112240', marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  hubIconCircle: { width: 55, height: 55, borderRadius: 28, borderWidth: 1, borderColor: '#00FFAD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  hubNavContent: { flex: 1 },
  hubNavTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  hubNavSub: { color: '#495670', fontSize: 11, marginTop: 4 },
  hubGreeting: { color: '#00FFAD', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  aboutText: { color: '#8892B0', fontSize: 14, lineHeight: 22 },
  missionDarkCard: { backgroundColor: '#0A192F', margin: 20, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
  challengeCard: {width: '48%',backgroundColor: '#112240',padding: 20,borderRadius: 15,alignItems: 'center',borderWidth: 1,borderColor: '#1E293B',marginBottom: 10},
  challengeStat: { fontSize: 22, fontWeight: '900', color: '#FFF', marginVertical: 8 },
  challengeLabel: { color: '#495670', fontSize: 10, fontWeight: 'bold' },
  solutionList: { marginHorizontal: 20, backgroundColor: '#112240', padding: 20, borderRadius: 20 },
  solRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  solText: { color: '#FFF', marginLeft: 12, fontSize: 13, fontWeight: '500' },
  visionQuote: { color: '#495670', fontStyle: 'italic', textAlign: 'center', marginTop: 40, paddingHorizontal: 40, fontSize: 12 },
  rvBadge: { backgroundColor: '#112240', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#4285F4' },
  rvText: { color: '#4285F4', fontSize: 8, fontWeight: 'bold' },
  sectionTitle: { color: '#495670', fontSize: 10, fontWeight: '900', marginVertical: 20, paddingHorizontal: 20, textTransform: 'uppercase', letterSpacing: 2 },
  gateOverlay: { flex: 1, backgroundColor: '#020C1B', justifyContent: 'center', alignItems: 'center' },
  gateLogo: { color: '#00FFAD', fontSize: 48, fontWeight: '900' },
  gateInputWrapper: { flexDirection: 'row', backgroundColor: '#112240', borderRadius: 15, marginTop: 30, padding: 5, width: '80%' },
  gateInput: { flex: 1, paddingHorizontal: 20, color: '#FFF' },
  gateBtn: { backgroundColor: '#00FFAD', width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  auditBadge: { backgroundColor: '#00FFAD20', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#00FFAD' },
  auditBadgeText: { color: '#00FFAD', fontSize: 10, fontWeight: 'bold' },
  auditGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'flex-start'},
  statCard: { width: '48%', backgroundColor: '#112240', padding: 16, borderRadius: 15, marginBottom: 14, borderWidth: 1, borderColor: '#1E293B' },
  statLabel: { color: '#8892B0', fontSize: 9, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  statFooter: { color: '#495670', fontSize: 9, marginTop: 4 },
  graphSection: { paddingHorizontal: 20, marginTop: 20 },
  progressBarBg: { height: 10, backgroundColor: '#112240', borderRadius: 5, overflow: 'hidden', marginVertical: 0 },
  progressBarFill: { height: '100%', backgroundColor: '#00FFAD', borderRadius: 5 },
  graphSub: { color: '#8892B0', fontSize: 12, lineHeight: 18 },
  exportBtn: { backgroundColor: '#00FFAD', marginHorizontal: 20, marginTop: 8, padding: 18, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  exportBtnText: { color: '#020C1B', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  syncBtn: { marginHorizontal: 20, marginTop: 10, padding: 15, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#00FFAD10', borderWidth: 1, borderColor: '#00FFAD30' },
  syncBtnText: { color: '#00FFAD', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  auditSection: { paddingHorizontal: 20, marginTop: 24 },
  auditBarLabel: { color: '#8892B0', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chartCard: { backgroundColor: '#0A192F', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#112240' },
  chartAxisLabel: { color: '#495670', fontSize: 9, fontWeight: '600' },
  chartNote: { color: '#8892B0', fontSize: 11, marginTop: 10, lineHeight: 16 },
  ringCaption: { color: '#495670', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  riskBanner: { borderRadius: 16, padding: 18, borderWidth: 1.5, gap: 10 },
  riskLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  riskValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  riskDesc: { color: '#8892B0', fontSize: 12, lineHeight: 18 },
  predictCard: { backgroundColor: '#0A192F', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#112240', gap: 6 },
  predictLabel: { color: '#495670', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  predictVal: { fontSize: 22, fontWeight: '900' },
  predictNote: { color: '#495670', fontSize: 9, marginTop: 2 },
  unitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A192F', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  unitDot: { width: 10, height: 10, borderRadius: 5 },
  unitName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  unitMeta: { color: '#495670', fontSize: 10, marginTop: 2 },
  unitTemp: { fontSize: 16, fontWeight: '900' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FF4D4D12', borderWidth: 1, borderColor: '#FF4D4D30', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  signOutText: { color: '#FF4D4D', fontSize: 11, fontWeight: '700' },
  trackingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#00FFAD12', borderWidth: 1, borderColor: '#00FFAD30', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  trackingPillText: { color: '#00FFAD', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});

// --- AUDIT CHART STYLES ---
const auditChartStyles = StyleSheet.create({
  chartTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  chartSub: { color: '#495670', fontSize: 10, lineHeight: 15 },
  riskCard: { borderRadius: 16, padding: 20, borderWidth: 1.5 },
  riskLevel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
  riskDesc: { color: '#8892B0', fontSize: 12, lineHeight: 18, flex: 1 },
});

// --- AUTH SCREEN STYLES ---
const authStyles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: '#020C1B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logoIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#00FFAD12', borderWidth: 1.5, borderColor: '#00FFAD40', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { color: '#00FFAD', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  logoSub: { color: '#495670', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, marginTop: 3 },
  card: { width: '100%', backgroundColor: '#0A192F', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1E293B' },
  tabRow: { flexDirection: 'row', backgroundColor: '#112240', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#00FFAD' },
  tabText: { color: '#495670', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#020C1B', fontWeight: '900' },
  cardHeading: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 6 },
  cardSub: { color: '#8892B0', fontSize: 12, lineHeight: 18, marginBottom: 22 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: '#495670', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#112240', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, color: '#FFF', paddingVertical: 13, paddingHorizontal: 10, fontSize: 14 },
  fieldHint: { color: '#2E3D55', fontSize: 10, marginTop: 5 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF4D4D12', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FF4D4D30' },
  errorText: { color: '#FF4D4D', fontSize: 12, flex: 1 },
  submitBtn: { backgroundColor: '#00FFAD', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  submitText: { color: '#020C1B', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  switchText: { color: '#8892B0', fontSize: 13 },
  footer: { color: '#2E3D55', fontSize: 10, marginTop: 28, letterSpacing: 0.5 },
});
