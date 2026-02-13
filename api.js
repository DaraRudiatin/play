import axios from 'axios';

// Direct API - No Third Party
const BASE_URL = 'https://h5-api.aoneroom.com/wefeed-h5api-bff';
const PLAY_BASE_URL = 'https://themoviebox.org/wefeed-h5api-bff';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjU3MTE1NTI3MjA4MTc1ODY0MCwiYXRwIjozLCJleHQiOiIxNzcwNTk4MzIzIiwiZXhwIjoxNzc4Mzc0MzIzLCJpYXQiOjE3NzA1OTgwMjN9.SZ0lmOj426RgrU1R1dksiP_DtY1cCoC4s4r2YwpD-0c';

const DRACIN_BASE_URL = 'https://apidracinplonz-9ib33v5xy-plonzs-projects.vercel.app'; // Dracin API Server (Hosted on Vercel)
const DRACIN_API_KEY = 'tworuan_dracin_2026_secret_key'; // API Key untuk proteksi

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: {
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'authorization': `Bearer ${BEARER_TOKEN}`,
    'content-type': 'application/json',
    'origin': 'https://themoviebox.org',
    'referer': 'https://themoviebox.org/',
    'x-client-info': '{"timezone":"Asia/Jakarta"}',
    'x-request-lang': 'en'
  }
});

const playApi = axios.create({
  baseURL: PLAY_BASE_URL,
  timeout: 45000,
  headers: {
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'authorization': `Bearer ${BEARER_TOKEN}`,
    'content-type': 'application/json',
    'origin': 'https://themoviebox.org',
    'referer': 'https://themoviebox.org/',
    'x-client-info': '{"timezone":"Asia/Jakarta"}',
    'x-request-lang': 'en'
  }
});

const dracinApi = axios.create({
  baseURL: DRACIN_BASE_URL,
  timeout: 45000,
  headers: {
    'x-api-key': DRACIN_API_KEY
  }
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (config._retry) {
      return Promise.reject(error);
    }
    
    if (!error.response && config) {
      config._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1500));
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

// Add interceptor for Play API
playApi.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (config._retry) {
      return Promise.reject(error);
    }
    
    if (!error.response && config) {
      config._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1500));
      return playApi(config);
    }
    
    return Promise.reject(error);
  }
);

// Add response interceptor for Dracin API
dracinApi.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (config._retry) {
      return Promise.reject(error);
    }
    
    if (!error.response && config) {
      config._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1500));
      return dracinApi(config);
    }
    
    return Promise.reject(error);
  }
);

// Transform API data to match app format
const transformMovieData = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items
    .filter(item => item && (item.subjectId || item.id))
    .map(item => ({
      id: item.subjectId || item.id,
      title: item.title || item.postTitle || 'No Title',
      poster: item.cover?.url || item.cover || '',
      rating: item.imdbRatingValue || null,
      year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
      type: item.subjectType === 1 ? 'movie' : 'series',
      genre: item.genre || null,
      detailPath: item.detailPath || '',
      description: item.description || item.intro || '',
      imdbRatingCount: item.imdbRatingCount || 0,
      duration: item.duration || 0,
      hasResource: item.hasResource || false
    }));
};

// Transform Dracin data to match app format
const transformDracinData = (dracinItems) => {
  if (!Array.isArray(dracinItems)) return [];
  
  return dracinItems
    .filter(item => item && item.bookId) // Filter out items without bookId
    .map(item => ({
      id: item.bookId,
      title: item.title || 'No Title',
      poster: item.cover || '',
      rating: null,
      year: null,
      type: 'drama',
      genre: null,
      detailPath: `dracin-${item.bookId}`, // Prefix with 'dracin-' to identify Dracin content
      intro: item.intro || '',
      chapterCount: item.chapterCount || 0,
      playCount: item.playCount || '',
      isDracin: true // Flag to identify Dracin content
    }));
};

// Cache for categories from home endpoint
let cachedCategories = null;
let categoriesCache = null;

// Fetch categories dynamically from home endpoint
export const fetchCategoriesFromHome = async () => {
  if (cachedCategories) {
    return cachedCategories;
  }

  try {
    const response = await api.get('/home', {
      params: { host: 'themoviebox.org' }
    });
    
    if (response.data.code === 0 && response.data.data) {
      const platformList = response.data.data.platformList || [];
      
      // Extract categories with IDs
      cachedCategories = platformList
        .filter(item => item.id && item.title)
        .reduce((acc, item) => {
          acc[item.id] = {
            id: item.id,
            title: item.title,
            uploadBy: item.uploadBy || ''
          };
          return acc;
        }, {});
      
      return cachedCategories;
    }
  } catch (error) {
    console.error('Failed to fetch categories from home:', error);
  }
  
  return {};
};

// Category IDs - Updated with correct IDs from actual API responses
const CATEGORY_IDS = {
  trending: 'home', // Special: use home endpoint
  'hollywood': '997144265920760504', // 2025 Popular Movies
  'indonesian-drama': '5283462032510044280', // Drama Indonesia Terkini
  'indonesian-movies': '6528093688173053896', // Trending Indonesian Movies
  'kdrama': '4380734070238626200', // K-Drama: New Release
  'western-tv': '7736026911486755336', // Western TV
  'cdrama': '8624142774394406504', // Most Popular C-Drama
  'anime': '5404290953194750296', // Trending Anime
  'indo-horror': '5848753831881965888', // Indonesian Horror Stories
  'thai-drama': '1164329479448281992', // Thai-Drama
  'animated-film': '7132534597631837112', // Animation
};

// API Functions
export const getTrending = async (page = 1) => {
  const response = await api.get('/subject/trending', {
    params: { 
      page: String(page - 1), // API uses 0-based pagination
      perPage: 18 
    }
  });
  
  if (response.data.code === 0 && response.data.data) {
    const subjectList = response.data.data.subjectList || [];
    const pager = response.data.data.pager || {};
    
    return {
      title: 'Trending',
      items: transformMovieData(subjectList),
      hasMore: pager.hasMore || false,
      nextPage: pager.nextPage || null,
      currentPage: String(page),
      totalCount: pager.totalCount || 0
    };
  }
  
  return { 
    title: 'Trending',
    items: [], 
    hasMore: false,
    currentPage: String(page)
  };
};

// Get all home data including platformList (categories) and operatingList (trending content)
export const getHomeData = async () => {
  const response = await api.get('/home', {
    params: { host: 'themoviebox.org' }
  });
  
  if (response.data.code === 0 && response.data.data) {
    const data = response.data.data;
    const platformList = data.platformList || [];
    const operatingList = data.operatingList || [];
    
    // Transform platformList to categories with content preview
    const categoriesWithContent = platformList
      .filter(item => item.id && item.title)
      .map(platform => ({
        id: platform.id,
        categoryId: platform.id,
        title: platform.title,
        uploadBy: platform.uploadBy || '',
        detailPath: platform.detailPath || '',
        // operatingList items that belong to this category can be filtered by checking detailPath or other criteria
      }));
    
    return {
      categories: categoriesWithContent,
      trending: transformMovieData(operatingList),
      platformList,
      operatingList
    };
  }
  
  return {
    categories: [],
    trending: [],
    platformList: [],
    operatingList: []
  };
};

export const getHollywood = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['hollywood'], page);
};

export const getIndonesianDrama = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['indonesian-drama'], page);
};

export const getIndonesianMovies = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['indonesian-movies'], page);
};

export const getKDrama = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['kdrama'], page);
};

export const getWesternTV = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['western-tv'], page);
};

export const getCDrama = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['cdrama'], page);
};

export const getAnime = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['anime'], page);
};

export const getIndoHorror = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['indo-horror'], page);
};

export const getThaiDrama = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['thai-drama'], page);
};

export const getAnimatedFilm = async (page = 1) => {
  return getCategoryContent(CATEGORY_IDS['animated-film'], page);
};

// Helper function to get category content
const getCategoryContent = async (categoryId, page = 1, perPage = 12) => {
  const response = await api.get('/ranking-list/content', {
    params: {
      id: categoryId,
      page: String(page),
      perPage
    }
  });
  
  if (response.data.code === 0 && response.data.data) {
    const subjectList = response.data.data.subjectList || [];
    const pager = response.data.data.pager || {};
    const title = response.data.data.title || '';
    
    // Langsung pakai hasMore dari API pager response
    // API return: "hasMore": true/false di pager object
    const hasMore = pager.hasMore === true;
    
    console.log('📄 Page', page, ':', {
      items: subjectList.length,
      hasMore,
      nextPage: pager.nextPage,
      pagerPage: pager.page
    });
    
    return {
      title,
      items: transformMovieData(subjectList),
      hasMore,
      nextPage: pager.nextPage || (hasMore ? String(parseInt(page) + 1) : null),
      currentPage: pager.page || String(page),
      perPage: pager.perPage || perPage,
      totalCount: pager.totalCount || 0
    };
  }
  
  return { 
    title: '',
    items: [], 
    hasMore: false, 
    currentPage: String(page),
    perPage
  };
};

export const searchContent = async (query, page = 1) => {
  try {
    const response = await api.post('/subject/search', {
      keyword: query,
      page: String(page - 1), // API uses 0-based pagination  
      perPage: 28,
      subjectType: 0 // 0 for all types
    });
    
    if (response.data.code === 0 && response.data.data) {
      // Search API returns items in data.items, not data.subjectList
      const items = response.data.data.items || response.data.data.subjectList || [];
      const pager = response.data.data.pager || {};
      
      return {
        items: transformMovieData(items),
        hasMore: pager.hasMore || false,
        nextPage: pager.nextPage || null,
        currentPage: String(page),
        totalCount: pager.totalCount || 0
      };
    }
  } catch (error) {
    console.error('Search API error:', error);
  }
  
  return { 
    items: [], 
    hasMore: false,
    currentPage: String(page)
  };
};

export const getDetail = async (detailPath) => {
  const response = await api.get('/detail', {
    params: { detailPath }
  });
  
  if (response.data.code === 0 && response.data.data) {
    const data = response.data.data;
    const subject = data.subject || {};
    const resource = data.resource || {};
    
    // Transform to match expected format by Detail.jsx
    return {
      success: true,
      data: {
        title: subject.title,
        description: subject.description,
        poster: subject.cover?.url || subject.cover || '',
        backdrop: subject.cover?.url || subject.cover || '',
        rating: subject.imdbRatingValue || null,
        imdbRatingCount: subject.imdbRatingCount || 0,
        year: subject.releaseDate ? new Date(subject.releaseDate).getFullYear() : null,
        releaseDate: subject.releaseDate || null,
        country: subject.countryName || null,
        genre: subject.genre || null,
        genres: subject.genre ? subject.genre.split(',') : [],
        type: subject.subjectType === 1 ? 'movie' : 'series',
        cast: (data.stars || []).map(star => ({
          name: star.name,
          character: star.character,
          avatar: star.avatarUrl,
          detailPath: star.detailPath
        })),
        detailPath: subject.detailPath,
        subjectId: subject.subjectId, // Store for play URL
        duration: subject.duration || 0,
        hasResource: subject.hasResource || false,
        trailer: subject.trailer || null,
        subtitles: subject.subtitles || '',
        // Transform seasons/episodes from resource
        // API format: se=0,maxEp=0 → movie (no episodes)
        //             se=1,maxEp=45,allEp="1,2,...,45" → series with episodes
        //             multiple seasons with se=1,2,3 → multi-season
        seasons: (resource.seasons || []).filter(season => {
          // Filter out movie entries (se=0, maxEp=0)
          return season.se > 0 && season.maxEp > 0;
        }).map(season => {
          // Generate episode list from allEp string or maxEp
          let episodeNumbers = [];
          if (season.allEp && season.allEp.trim() !== '') {
            // Parse comma-separated episode numbers: "1,2,3,...,45"
            episodeNumbers = season.allEp.split(',').map(ep => parseInt(ep.trim())).filter(n => !isNaN(n));
          } else {
            // allEp empty → generate 1 to maxEp
            for (let i = 1; i <= season.maxEp; i++) {
              episodeNumbers.push(i);
            }
          }
          
          return {
            seasonNumber: season.se,
            seasonName: `Season ${season.se}`,
            episodes: episodeNumbers.map(epNum => ({
              episodeNumber: epNum,
              episodeName: `Episode ${epNum}`,
              thumbnail: subject.cover?.url || '',
              hasPlayer: true
            }))
          };
        }),
        // Metadata
        metadata: data.metadata || {},
        uploadBy: resource.uploadBy || '',
        source: resource.source || ''
      }
    };
  }
  
  throw new Error('Failed to fetch detail');
};

// Get video play URL - Updated for Vercel deployment
// OLD: Browser calls Vite proxy /tmb-play/ → themoviebox.org
// NEW: Browser calls Vercel API /api/play or backend proxy server
export const getPlayUrl = async (subjectId, season = 1, episode = 1, detailPath = '') => {
  try {
    // Detect environment: Vercel production or local development
    const isProduction = window.location.hostname !== 'localhost';
    const useProxy = true; // Set to false to use direct API, true to use DataImpulse proxy
    
    let url;
    if (isProduction) {
      // Production: Use Vercel API endpoints
      url = useProxy 
        ? `/api/play-with-proxy?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}`
        : `/api/play?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}`;
    } else {
      // Development: Use local proxy server or Vite proxy
      const useLocalProxy = true; // Set to true to use local proxy server
      if (useLocalProxy) {
        url = useProxy
          ? `http://localhost:3003/api/play-with-proxy?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}`
          : `http://localhost:3003/api/play?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}`;
      } else {
        // Fallback to Vite proxy (may have timeout issues)
        url = `/tmb-play/subject/play?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}`;
      }
    }
    
    console.log(`🎬 Fetching play URL:`, {
      environment: isProduction ? 'production' : 'development',
      useProxy,
      url: url.substring(0, 100) + '...'
    });
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-client-info': '{"timezone":"Asia/Jakarta"}'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Play API HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle both direct API format and proxy server format
    if (data.success && data.streams) {
      // Proxy server format
      return {
        streams: data.streams || [],
        hls: data.hls || [],
        dash: data.dash || [],
        freeNum: data.freeNum || 0,
        limited: data.limited || false,
        hasResource: true,
        proxyUsed: data.proxyUsed || false,
        proxyIP: data.proxyIP,
        proxyProvider: data.proxyProvider
      };
    } else if (data.code === 0 && data.data) {
      // Direct API format
      return {
        streams: data.data.streams || [],
        hls: data.data.hls || [],
        dash: data.data.dash || [],
        freeNum: data.data.freeNum || 0,
        limited: data.data.limited || false,
        hasResource: data.data.hasResource || false
      };
    }
    
    throw new Error(data.message || data.error || 'Failed to fetch play URL');
  } catch (error) {
    console.error('getPlayUrl error:', error);
    throw error;
  }
};

// Get captions/subtitles - Updated for Vercel deployment
export const getCaptions = async (streamId, subjectId, detailPath = '') => {
  try {
    // Detect environment: Vercel production or local development  
    const isProduction = window.location.hostname !== 'localhost';
    
    let response;
    if (isProduction) {
      // Production: Use Vercel API endpoint
      response = await fetch(`/api/subtitles?id=${streamId}&subjectId=${subjectId}&detailPath=${encodeURIComponent(detailPath)}`, {
        headers: {
          'accept': 'application/json'
        }
      });
    } else {
      // Development: Use local proxy server or direct API
      const useLocalProxy = true;
      if (useLocalProxy) {
        response = await fetch(`http://localhost:3003/api/subtitles?id=${streamId}&subjectId=${subjectId}&detailPath=${encodeURIComponent(detailPath)}`, {
          headers: {
            'accept': 'application/json'
          }
        });
      } else {
        // Fallback to direct API call via Vite proxy
        response = await api.get('/subject/caption', {
          params: {
            format: 'MP4',
            id: streamId,
            subjectId,
            detailPath
          }
        });
        
        if (response.data?.code === 0 && response.data?.data?.captions) {
          return response.data.data.captions;
        }
        return [];
      }
    }
    
    if (response.ok) {
      const data = await response.json();
      return data.captions || [];
    }
  } catch (e) {
    console.warn('Failed to fetch captions:', e);
  }
  return [];
};

// ========== Dracin API Functions ==========

export const getDracinFeatured = async (page = 1) => {
  const response = await dracinApi.get('/enviel/drama/featured', {
    params: { page, size: 20 }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: items.length >= 20,
    currentPage: page,
    perPage: 20
  };
};

export const getDracinLatest = async (page = 1) => {
  const response = await dracinApi.get('/enviel/drama/latest', {
    params: { page, size: 20 }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: items.length >= 20,
    currentPage: page,
    perPage: 20
  };
};

export const getDracinRanking = async (page = 1) => {
  const type = 1; // Ranking type
  const response = await dracinApi.get('/enviel/drama/rank', {
    params: { type }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: false, // Ranking is usually fixed list
    currentPage: 1,
    perPage: items.length
  };
};

export const getDracinIndoDubbed = async (page = 1) => {
  const response = await dracinApi.get('/enviel/drama/indo', {
    params: { page, size: 20 }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: items.length >= 20,
    currentPage: page,
    perPage: 20
  };
};

export const getDracinAll = async (page = 1) => {
  const response = await dracinApi.get('/enviel/drama/all', {
    params: { page, limit: 50 }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: items.length >= 50,
    currentPage: page,
    perPage: 50
  };
};

export const searchDracinDrama = async (query, page = 1) => {
  const response = await dracinApi.get('/enviel/drama/search', {
    params: { q: query, page, size: 20 }
  });
  const items = response.data.data || [];
  return {
    items: transformDracinData(items),
    hasMore: items.length >= 20,
    currentPage: page,
    perPage: 20
  };
};

export const getDracinDetail = async (bookId) => {
  const response = await dracinApi.get(`/enviel/drama/detail/${bookId}`);
  return response.data.data;
};

export const getDracinEpisodes = async (bookId) => {
  const response = await dracinApi.get(`/enviel/drama/episodes/${bookId}`);
  return response.data;
};

// Category mapping - Updated based on actual API responses
// These are the main navigation categories
// Create a trending category function that uses the trending API
export const getTrendingCategory = async (page = 1) => {
  const trendingData = await getTrending(page);
  return {
    title: trendingData.title,
    items: trendingData.items,
    hasMore: trendingData.hasMore,
    currentPage: trendingData.currentPage,
    nextPage: trendingData.nextPage
  };
};

export const categories = [
  { id: 'trending', label: 'Trending🔥', icon: 'fas fa-fire', fetch: getTrendingCategory },
  { id: 'hollywood', label: 'Hollywood Movies', icon: 'fas fa-film', fetch: getHollywood },
  { id: 'indonesian-drama', label: 'Indonesian Drama', icon: 'fas fa-tv', fetch: getIndonesianDrama },
  { id: 'indonesian-movies', label: 'Indonesian Movies', icon: 'fas fa-video', fetch: getIndonesianMovies },
  { id: 'kdrama', label: 'K-Drama', icon: 'fas fa-heart', fetch: getKDrama },
  { id: 'western-tv', label: 'Western TV', icon: 'fas fa-globe', fetch: getWesternTV },
  { id: 'cdrama', label: 'C-Drama', icon: 'fas fa-dragon', fetch: getCDrama },
  { id: 'anime', label: 'Anime', icon: 'fas fa-fire', fetch: getAnime },
  { id: 'indo-horror', label: 'Indo Horror', icon: 'fas fa-ghost', fetch: getIndoHorror },
  { id: 'thai-drama', label: 'Thai-Drama', icon: 'fas fa-star', fetch: getThaiDrama },
  { id: 'animated-film', label: 'Animated Film', icon: 'fas fa-palette', fetch: getAnimatedFilm },
];

// Get category by ID (with fallback to CATEGORY_IDS)
export const getCategoryById = (categoryId) => {
  return CATEGORY_IDS[categoryId] || categoryId;
};

export default api;
