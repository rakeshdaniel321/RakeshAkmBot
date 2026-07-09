import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';

import GoldCoins from './components/GoldCoins';
import Home from './pages/Home';
import DestinyAboutCard from './pages/DestinyAboutCard'; 
import Projects from './pages/Projects';
import Skills from './pages/Skills';
import FlamesModal from './components/FlamesModal';
import SidebarSocials from './components/SidebarSocials';
import About from './pages/About';

function AnalyticsTracker() {
  const location = useLocation();
  const [userId, setUserId] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let currentUserId = urlParams.get('tgId');

    if (!currentUserId && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); 
      if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUserId = tg.initDataUnsafe.user.id.toString();
      }
    }

    if (!currentUserId) {
      currentUserId = "WEB_" + Math.floor(100000 + Math.random() * 900000);
    }

    setUserId(currentUserId);
    sendInitialMetrics(currentUserId);

    return () => {
      const totalScreenTimeSec = Math.floor((Date.now() - startTime) / 1000);
      if (currentUserId) {
        navigator.sendBeacon(
          'https://rakeshakmbot.onrender.com/api/update-screen-time',
          JSON.stringify({ telegramId: currentUserId, screenTime: totalScreenTimeSec })
        );
      }
    };
  }, []);

  useEffect(() => {
    if (userId) {
      axios.post('https://rakeshakmbot.onrender.com/api/track-page', {
        telegramId: userId,
        page: location.pathname
      }).catch(err => console.error("Page track error:", err.message));
    }
  }, [location, userId]);

  const sendInitialMetrics = async (tgId) => {
    // 🌐 Exact Browser Client Configuration
    const browser = navigator.userAgent;
    const screenSize = `${window.innerWidth}x${window.innerHeight}`;

    const fallbackToIPLocation = async () => {
      try {
        const ipRes = await axios.get('https://ipapi.co/json/');
        const { city, region, postal, country_name } = ipRes.data;
        return `${city} (${postal || 'No-Zip'}), ${region}, ${country_name} [IP-Tracking]`;
      } catch (err) {
        try {
          const backupIpRes = await axios.get('https://ipwho.is/');
          if(backupIpRes.data && backupIpRes.data.success) {
             return `${backupIpRes.data.city}, ${backupIpRes.data.region}, ${backupIpRes.data.country} [Backup-IP]`;
          }
          return "Permission Denied / N/A";
        } catch (backupErr) {
          return "Permission Denied / N/A";
        }
      }
    };

    // 🎯 Real-time HTML5 Map & Geolocation Request
    if (navigator.geolocation) {
      const geoOptions = {
        enableHighAccuracy: true, 
        timeout: 25000, // User allow pannuvatharku 25 seconds time limits
        maximumAge: 0             
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          let resolvedLocation = "Geocode Failed / N/A";

          try {
            // Live map service reverse geocoding to extract village, city, area
            const geoRes = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'RakeshPortfolioAnalytics/1.0' } }
            );
            
            const address = geoRes.data.address;
            const currentArea = address.suburb || address.neighbourhood || address.village || address.city_district || address.road || "Unknown Area";
            const city = address.city || address.town || address.district || "Unknown City";
            const state = address.state || "";
            
            resolvedLocation = `${currentArea}, ${city}, ${state} [True-GPS]`;
          } catch (err) {
            resolvedLocation = await fallbackToIPLocation();
          }

          // Data payload-a backend-uku anupurathu
          await axios.post('https://rakeshakmbot.onrender.com/api/save-metrics', {
            telegramId: tgId, browser, screenSize, latitude: lat, longitude: lon, resolvedLocation
          }).catch(err => console.error("Metrics send error:", err.message));
        },
        async (error) => {
          console.log("GPS Blocked / Denied. Using network location...");
          const ipLocation = await fallbackToIPLocation();

          await axios.post('https://rakeshakmbot.onrender.com/api/save-metrics', {
            telegramId: tgId, browser, screenSize, latitude: null, longitude: null, resolvedLocation: ipLocation 
          }).catch(err => console.error("Metrics backup error:", err.message));
        },
        geoOptions
      );
    } else {
      const ipLocation = await fallbackToIPLocation();
      await axios.post('https://rakeshakmbot.onrender.com/api/save-metrics', {
        telegramId: tgId, browser, screenSize, latitude: null, longitude: null, resolvedLocation: ipLocation
      }).catch(err => console.error("Metrics fallback error:", err.message));
    }
  };

  return null;
}

function CenterNavigationTrigger() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname !== "/") return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
      <button
        onClick={() => navigate('/here')}
        className="group flex flex-col items-center justify-center pointer-events-auto bg-transparent border-none outline-none focus:outline-none active:scale-95 transition-transform duration-200"
      >
        <h1 className="font-sans text-4xl md:text-5xl font-black uppercase tracking-wider text-white transition-colors duration-300 group-hover:text-red-500">
          RAKESH DANIEL
        </h1>
        <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest mt-2 transition-colors duration-300 group-hover:text-zinc-200 animate-pulse">
          click here
        </span>
      </button>
    </div>
  );
}

function GlobalBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === "/" || location.pathname === "/flames") return null;

  return (
    <button 
      onClick={() => navigate('/')} 
      className="fixed top-4 left-4 z-50 p-2.5 rounded-full border border-white/20 bg-zinc-900/60 backdrop-blur-md shadow-lg active:scale-95 transition flex items-center justify-center text-white/80 hover:text-white"
    >
      <ArrowLeft size={20} />
    </button>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white font-sans relative overflow-x-hidden select-none">
        <AnalyticsTracker />
        <GoldCoins />
        <GlobalBackButton />
        <CenterNavigationTrigger />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/here" element={<DestinyAboutCard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/flames" element={<FlamesModal isOpen={true} onClose={() => window.location.href = '/'} />} />
        </Routes>

        <SidebarSocials /> 

        <style>{`
          body { background-color: #000000 !important; }
          .infinite-color-text { animation: textFourColors 5s infinite linear !important; }
          @keyframes textFourColors {
            0%, 100% { color: #ff3333 !important; }
            25% { color: #3366ff !important; }
            50% { color: #22cc22 !important; }
            75% { color: #eecc00 !important; }
          }
        `}</style>
      </div>
    </Router>
  );
}