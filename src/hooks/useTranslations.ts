import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Language = 'english' | 'bemba' | 'nyanja';

interface Translations {
  [key: string]: {
    english: string;
    bemba: string;
    nyanja: string;
  };
}

const translations: Translations = {
  // Auth/Account translations
  'account': {
    english: 'Account',
    bemba: 'Akawunti',
    nyanja: 'Akaunti'
  },
  'login': {
    english: 'Login',
    bemba: 'Injila',
    nyanja: 'Lowa'
  },
  'register': {
    english: 'Register',
    bemba: 'Wikalile',
    nyanja: 'Lembani'
  },
  // Header translations
  'header.bookTickets': {
    english: 'Book Tickets',
    bemba: 'Kola Matiketi',
    nyanja: 'Gula Matiketi'
  },
  'header.myBookings': {
    english: 'My Bookings',
    bemba: 'Ukukula Kwandi',
    nyanja: 'Zogula Zanga'
  },
  'header.routes': {
    english: 'Routes',
    bemba: 'Inshila',
    nyanja: 'Njira'
  },
  'header.contact': {
    english: 'Contact',
    bemba: 'Tubakumane',
    nyanja: 'Tukumane'
  },
  'header.login': {
    english: 'Login',
    bemba: 'Injila',
    nyanja: 'Lowa'
  },
  'header.signUp': {
    english: 'Sign Up',
    bemba: 'Wikalile',
    nyanja: 'Lembani'
  },
  'header.logout': {
    english: 'Logout',
    bemba: 'Fuma',
    nyanja: 'Tuluka'
  },
  'header.language': {
    english: 'Language',
    bemba: 'Ululimi',
    nyanja: 'Chilankhulo'
  },
  'header.selectLanguage': {
    english: 'Select Language',
    bemba: 'Sanula Ululimi',
    nyanja: 'Sankhani Chilankhulo'
  },
  
  // Routes page translations
  'routes.title': {
    english: 'Bus Routes & Schedules',
    bemba: 'Inshila Sha Mabasi Nemusango',
    nyanja: 'Njira Za Mabasi Ndi Ndondomeko'
  },
  'routes.subtitle': {
    english: 'Find the perfect bus route for your journey across Zambia',
    bemba: 'Mono inshila yakufwaila paululendo lwenu muli Zambia',
    nyanja: 'Pezani njira yabwino ya mabasi paulendo wanu mu Zambia'
  },
  'routes.filterByCity': {
    english: 'Filter by City',
    bemba: 'Sanula Umushi',
    nyanja: 'Sankhani Mzinda'
  },
  'routes.filterByCompany': {
    english: 'Filter by Bus Company',
    bemba: 'Sanula Kampani Ya Basi',
    nyanja: 'Sankhani Kampani Ya Mabasi'
  },
  'routes.searchPlaceholder': {
    english: 'Search routes or operators...',
    bemba: 'Sakila inshila nangu abanyamishishi...',
    nyanja: 'Funsani njira kapena oyendetsa...'
  },
  'routes.allCities': {
    english: 'All Cities',
    bemba: 'Yonse Imishi',
    nyanja: 'Mizinda Yonse'
  },
  'routes.allCompanies': {
    english: 'All Bus Companies',
    bemba: 'Shonse Ikampani Sha Mabasi',
    nyanja: 'Makampani Onse A Mabasi'
  },
  'routes.popularRoutes': {
    english: 'Popular Routes',
    bemba: 'Inshila Shinkulu',
    nyanja: 'Njira Zodziwika'
  },
  'routes.allRoutes': {
    english: 'All Available Routes',
    bemba: 'Shonse Inshila Shililapafupi',
    nyanja: 'Njira Zonse Zomwe Zilipo'
  },
  'routes.from': {
    english: 'From',
    bemba: 'Ukufuma',
    nyanja: 'Kuchoka'
  },
  'routes.to': {
    english: 'To',
    bemba: 'Ukufika',
    nyanja: 'Kupita'
  },
  'routes.departure': {
    english: 'Departure',
    bemba: 'Ukufuma',
    nyanja: 'Kuchoka'
  },
  'routes.arrival': {
    english: 'Arrival',
    bemba: 'Ukufika',
    nyanja: 'Kufika'
  },
  'routes.price': {
    english: 'Price',
    bemba: 'Tengo',
    nyanja: 'Mtengo'
  },
  'routes.operator': {
    english: 'Operator',
    bemba: 'Umunyamishishi',
    nyanja: 'Woyendetsa'
  },
  'routes.busClass': {
    english: 'Bus Class',
    bemba: 'Ukusankwa Kwa Basi',
    nyanja: 'Mtundu Wa Basi'
  },
  'routes.seats': {
    english: 'seats',
    bemba: 'impuna',
    nyanja: 'mipando'
  },
  'routes.bookNow': {
    english: 'Book Now',
    bemba: 'Kola Nomba',
    nyanja: 'Gulani Tsopano'
  },
  'routes.clearFilters': {
    english: 'Clear All Filters',
    bemba: 'Bushe Fyonse Ukusanula',
    nyanja: 'Chotsani Zosankha Zonse'
  },
  'routes.noRoutes': {
    english: 'No routes found matching your criteria.',
    bemba: 'Taku inshila shakumona ukuya kumulingo wenu.',
    nyanja: 'Palibe njira zopezeka zomwe zikugwirizana ndi zomwe mukufuna.'
  },
  'routes.tryDifferent': {
    english: 'Try adjusting your filters or search terms.',
    bemba: 'Yesha ukusintha ukusanula nangu amashiwi mukusakila.',
    nyanja: 'Yesani kusintha zomwe mukusankha kapena mawu anu ofunafuna.'
  },
  
  // Bus class translations
  'busClass.economy': {
    english: 'Economy',
    bemba: 'Ukuchepeshesha',
    nyanja: 'Wotsika Mtengo'
  },
  'busClass.luxury': {
    english: 'Luxury',
    bemba: 'Ukuchusha',
    nyanja: 'Wamtengo Wokwera'
  },
  'busClass.vip': {
    english: 'VIP',
    bemba: 'VIP',
    nyanja: 'VIP'
  },
  
  // Amenity translations
  'amenities.wifi': {
    english: 'WiFi',
    bemba: 'WiFi',
    nyanja: 'WiFi'
  },
  'amenities.ac': {
    english: 'Air Conditioning',
    bemba: 'Ukutonsha Umoya',
    nyanja: 'Kuzizira Mpweya'
  },
  'amenities.entertainment': {
    english: 'Entertainment',
    bemba: 'Ukusangalala',
    nyanja: 'Zosangalatsa'
  },
  'amenities.charging': {
    english: 'Phone Charging',
    bemba: 'Ukuchaja Esimi',
    nyanja: 'Kuchaja Foni'
  },
  'amenities.refreshments': {
    english: 'Refreshments',
    bemba: 'Akakulya',
    nyanja: 'Zakudya'
  },
  
  // Index page translations
  'index.welcome': {
    english: 'Welcome back',
    bemba: 'Mwaiseni',
    nyanja: 'Takulandirani'
  },
  'index.findRoute': {
    english: 'Find Your Route',
    bemba: 'Mona Inshila Yenu',
    nyanja: 'Pezani Njira Yanu'
  },
  'index.travelUpdates': {
    english: 'Travel Updates',
    bemba: 'Fyashintululuka',
    nyanja: 'Zosintha Zaulendo'
  },
  'index.bookTicket': {
    english: 'Book a Ticket',
    bemba: 'Kola Tiketi',
    nyanja: 'Gulani Tiketi'
  },
  'index.searchBook': {
    english: 'Search and book your journey',
    bemba: 'Sakila no kola ulendo lwenu',
    nyanja: 'Funsani ndi kugula ulendo wanu'
  },
  'index.myBookings': {
    english: 'My Bookings',
    bemba: 'Ukukula Kwandi',
    nyanja: 'Zogula Zanga'
  },
  'index.viewBookings': {
    english: 'View your ticket bookings',
    bemba: 'Mona ukukula kwenu kwa matiketi',
    nyanja: 'Onani zogula zanu za matiketi'
  },
  'index.viewRoutes': {
    english: 'View Routes',
    bemba: 'Mona Inshila',
    nyanja: 'Onani Njira'
  },
  'index.exploreRoutes': {
    english: 'Explore all available routes',
    bemba: 'Mona shonse inshila shililapafupi',
    nyanja: 'Fufuzani njira zonse zomwe zilipo'
  },
  'index.contactSupport': {
    english: 'Contact Support',
    bemba: 'Tubakumane',
    nyanja: 'Tukumane'
  },
  'index.getHelp': {
    english: 'Get help with your journey',
    bemba: 'Kwaya ubuyambi pa ulendo lwenu',
    nyanja: 'Pezani thandizo paulendo wanu'
  },
  'index.hi': {
    english: 'Hi',
    bemba: 'Muli',
    nyanja: 'Moni'
  },
  'index.guest': {
    english: 'Guest',
    bemba: 'Mwina',
    nyanja: 'Wolemba'
  }
};

export const useTranslations = () => {
  const { user, guestLanguage, isAuthenticated } = useAuth();
  const [languageChanged, setLanguageChanged] = useState(0);
  
  // Listen for language change events
  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguageChanged(prev => prev + 1);
    };
    window.addEventListener('language-changed', handleLanguageChange);
    return () => window.removeEventListener('language-changed', handleLanguageChange);
  }, []);

  const currentLanguage: Language = isAuthenticated 
    ? (user?.preferredLanguage || 'english') 
    : guestLanguage;

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation key "${key}" not found`);
      return key;
    }
    return translation[currentLanguage] || translation.english || key;
  };

  return { t, currentLanguage };
};