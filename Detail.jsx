import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDetail, getDracinDetail, getDracinEpisodes } from '../services/api';
import { LoadingSpinner } from '../components/Loading';
import NativeBanner from '../components/NativeBanner';
import { formatRating, formatGenres, getPlaceholderImage } from '../utils/helpers';
import { triggerPopunder } from '../utils/adLoader';
import './Detail.css';

const Detail = () => {
  const { detailPath } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [playerUrl, setPlayerUrl] = useState(null);
  const [availablePlayerUrl, setAvailablePlayerUrl] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [popunderTriggered, setPopunderTriggered] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(0);
  const [autoPlayTimer, setAutoPlayTimer] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if detailPath looks like a numeric ID (subjectId) instead of proper detailPath
      const isNumericId = /^\d+$/.test(detailPath);
      if (isNumericId) {
        setError(`Invalid movie link. Please return to home and try clicking the movie again.`);
        setLoading(false);
        return;
      }
      
      // Check if this is Dracin content
      const isDracin = detailPath.startsWith('dracin-');
      
      if (isDracin) {
        // Extract bookId from detailPath (remove 'dracin-' prefix)
        const bookId = detailPath.replace('dracin-', '');
        
        // Fetch Dracin detail and episodes
        const [detailData, episodesData] = await Promise.all([
          getDracinDetail(bookId),
          getDracinEpisodes(bookId)
        ]);
        
        console.log('Dracin Detail:', detailData);
        console.log('Dracin Episodes:', episodesData);
        
        // Transform Dracin data to expected format
        const detail = {
          title: detailData.title || episodesData.metadata?.title,
          description: detailData.intro || episodesData.metadata?.intro,
          poster: detailData.cover || episodesData.metadata?.cover,
          backdrop: detailData.cover || episodesData.metadata?.cover,
          rating: null,
          year: null,
          releaseDate: null,
          country: null,
          genre: 'Drama',
          genres: ['Drama'],
          type: 'series',
          cast: [],
          detailPath: detailPath,
          isDracin: true,
          bookId: bookId,
          totalEpisodes: episodesData.total || detailData.totalEpisodes,
          seasons: [{
            seasonNumber: 1,
            seasonName: 'Season 1',
            episodes: (episodesData.data || detailData.episodes || []).map(ep => ({
              episodeNumber: ep.index + 1,
              episodeName: ep.title,
              playerUrl: ep.url,
              thumbnail: detailData.cover || episodesData.metadata?.cover
            }))
          }]
        };
        
        setDetail(detail);
        console.log('Dracin Detail set with episodes:', detail);
        
        // Auto-select first season and episode for Dracin content
        if (detail.seasons && detail.seasons.length > 0) {
          const firstSeason = detail.seasons[0];
          setSelectedSeason(firstSeason);
          
          if (firstSeason.episodes && firstSeason.episodes.length > 0) {
            const firstEpisode = firstSeason.episodes[0];
            setSelectedEpisode(firstEpisode);
            if (firstEpisode.playerUrl) {
              setAvailablePlayerUrl(firstEpisode.playerUrl);
            }
          }
        }
        
      } else {
        // Regular content handling
        const response = await getDetail(detailPath);
        
        console.log('API Response:', response);
        
        // Handle API response format with success wrapper
        if (!response.success || !response.data) {
          throw new Error('Failed to fetch details');
        }
        
        const data = response.data;
        console.log('Detail Data:', data);
        console.log('Seasons from API:', data.seasons);
        
        // Transform to expected format
        const detail = {
          title: data.title,
          description: data.description,
          poster: data.poster,
          backdrop: data.poster,
          rating: data.rating,
          year: data.year,
          releaseDate: data.releaseDate,
          country: data.country,
          genre: data.genre,
          genres: data.genre?.split(',') || [],
          type: data.type,
          cast: data.cast || [],
          detailPath: data.detailPath,
          subjectId: data.subjectId, // Important for getPlayUrl
          hasResource: data.hasResource,
          subtitles: data.subtitles,
          duration: data.duration || 0,
          trailer: data.trailer || null,
          // seasons already filtered by api.js (movie = empty, series = episodes)
          seasons: data.seasons || []
        };
        
        setDetail(detail);
        
        const isMovie = detail.type === 'movie' || detail.seasons.length === 0;
        
        console.log('Detail:', { title: detail.title, type: detail.type, isMovie, seasonsCount: detail.seasons.length, subjectId: detail.subjectId });
        
        if (!isMovie && detail.seasons.length > 0) {
          // Series: auto-select first season and episode
          const firstSeason = detail.seasons[0];
          setSelectedSeason(firstSeason);
          
          if (firstSeason.episodes && firstSeason.episodes.length > 0) {
            setSelectedEpisode(firstSeason.episodes[0]);
          }
        }
        
        // If hasResource, mark as playable (play URL will be fetched on click)
        if (detail.hasResource && detail.subjectId) {
          setAvailablePlayerUrl('PLAY_VIA_API');
        }
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
      setError('Failed to load details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [detailPath]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Update document title when detail or episode changes
  useEffect(() => {
    if (detail) {
      let episodeLabel = '';
      if (selectedSeason && selectedEpisode) {
        const episodeNum = selectedEpisode.episodeNumber || selectedEpisode.episode || 1;
        episodeLabel = ` - Episode ${episodeNum}`;
      }
      document.title = `${detail.title}${episodeLabel} - TWORUAN`;
    }
  }, [detail, selectedSeason, selectedEpisode]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimer) clearTimeout(autoPlayTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [autoPlayTimer, countdownTimer]);

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
    if (season.episodes && season.episodes.length > 0) {
      const firstEpisode = season.episodes[0];
      setSelectedEpisode(firstEpisode);
      
      if (showPlayer && detail?.subjectId) {
        // Fetch and play first episode of new season
        fetchAndPlay(detail.subjectId, season.seasonNumber || 1, firstEpisode.episodeNumber || 1, detail.detailPath);
      }
    }
  };

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode);
    
    // Clear any existing timers
    if (autoPlayTimer) clearTimeout(autoPlayTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    setAutoPlayCountdown(0);
    
    // Trigger popunder saat ganti episode
    triggerPopunder();
    
    if (detail?.isDracin && episode.playerUrl) {
      // Dracin: use direct playerUrl
      setAvailablePlayerUrl(episode.playerUrl);
      setPlayerUrl(episode.playerUrl);
      setShowPlayer(true);
      setPlayerLoading(true);
      setTimeout(() => setPlayerLoading(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startAutoPlayTimer();
    } else if (detail?.subjectId) {
      // API content: load video.php player
      setShowPlayer(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      fetchAndPlay(
        detail.subjectId,
        selectedSeason?.seasonNumber || 1,
        episode.episodeNumber || 1,
        detail.detailPath
      );
    }
  };

  // video.html panggil API sendiri lewat Vite proxy (self-contained, mirip video.php)
  // Detail.jsx cuma kirim params via URL, video.html yang fetch data
  const fetchAndPlay = (subjectId, season, episode, detailPath) => {
    const title = encodeURIComponent(detail?.title || '');
    const playerIframeUrl = `/video.html?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${encodeURIComponent(detailPath)}&title=${title}`;
    
    console.log('🎬 Loading player:', { subjectId, season, episode, detailPath });
    
    setPlayerUrl(playerIframeUrl);
    setAvailablePlayerUrl(playerIframeUrl);
    setShowPlayer(true);
    setPlayerLoading(true);
  };
  
  const getNextEpisode = () => {
    if (!selectedSeason || !selectedEpisode) return null;
    
    const currentIndex = selectedSeason.episodes.findIndex(
      ep => ep.episodeNumber === selectedEpisode.episodeNumber
    );
    
    if (currentIndex >= 0 && currentIndex < selectedSeason.episodes.length - 1) {
      return selectedSeason.episodes[currentIndex + 1];
    }
    
    return null;
  };
  
  const getPreviousEpisode = () => {
    if (!selectedSeason || !selectedEpisode) return null;
    
    const currentIndex = selectedSeason.episodes.findIndex(
      ep => ep.episodeNumber === selectedEpisode.episodeNumber
    );
    
    if (currentIndex > 0) {
      return selectedSeason.episodes[currentIndex - 1];
    }
    
    return null;
  };
  
  const handleNextEpisode = () => {
    const nextEpisode = getNextEpisode();
    if (nextEpisode) {
      handleEpisodeSelect(nextEpisode);
    }
  };
  
  const handlePreviousEpisode = () => {
    const prevEpisode = getPreviousEpisode();
    if (prevEpisode) {
      handleEpisodeSelect(prevEpisode);
    }
  };
  
  const startAutoPlayTimer = () => {
    // Clear existing timers
    if (autoPlayTimer) clearTimeout(autoPlayTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    setAutoPlayCountdown(0);
    
    // Episode duration: 5 minutes for testing (300000ms)
    // Change to 2100000 (35 min) for production
    const episodeDuration = 300000; // 5 minutes
    
    // Start countdown 10 seconds before episode ends
    const timer = setTimeout(() => {
      const nextEpisode = getNextEpisode();
      if (nextEpisode) {
        // Start 10 second countdown
        setAutoPlayCountdown(10);
        
        const countdown = setInterval(() => {
          setAutoPlayCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              // Auto play next episode
              handleEpisodeSelect(nextEpisode);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        setCountdownTimer(countdown);
      }
    }, episodeDuration - 10000);
    
    setAutoPlayTimer(timer);
  };
  
  const cancelAutoPlay = () => {
    if (autoPlayTimer) clearTimeout(autoPlayTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    setAutoPlayCountdown(0);
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Trigger popunder hanya 1x saat play pertama kali
    if (!popunderTriggered) {
      triggerPopunder();
      setPopunderTriggered(true);
      console.log('Popunder triggered on first play');
    }
    
    if (detail?.isDracin && availablePlayerUrl && availablePlayerUrl !== 'PLAY_VIA_API') {
      // Dracin: use direct playerUrl
      setPlayerUrl(availablePlayerUrl);
      setShowPlayer(true);
      setPlayerLoading(true);
      setTimeout(() => setPlayerLoading(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startAutoPlayTimer();
    } else if (detail?.subjectId) {
      // API content: load video.php player
      setShowPlayer(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Movie: se=0, ep=0 | Series: use selected season/episode
      const isMovie = detail.type === 'movie' || !detail.seasons || detail.seasons.length === 0;
      const seasonNum = isMovie ? 0 : (selectedSeason?.seasonNumber || 1);
      const episodeNum = isMovie ? 0 : (selectedEpisode?.episodeNumber || 1);
      
      fetchAndPlay(detail.subjectId, seasonNum, episodeNum, detail.detailPath);
    }
  };

  const handlePlayerLoad = () => {
    // Hide loading immediately when iframe loaded
    setPlayerLoading(false);
  };

  if (loading) {
    return (
      <div className="detail-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '60px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="detail-page">
        <div className="error-message">
          <h2>😞 {error || 'Content not found'}</h2>
          <button className="btn btn-primary" onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get episode label for title
  const getEpisodeLabel = () => {
    if (!selectedSeason || !selectedEpisode) return '';
    const episodeNum = selectedEpisode.episodeNumber || selectedEpisode.episode || 1;
    return ` - Episode ${episodeNum}`;
  };

  // Debug log before render
  console.log('Rendering with:', {
    hasSeasons: detail?.seasons && detail.seasons.length > 0,
    seasonsCount: detail?.seasons?.length,
    selectedSeason,
    showPlayer
  });

  return (
    <div className={`detail-page ${showPlayer ? 'player-active' : ''}`}>
      {/* Video Player - Show when playing */}
      {showPlayer && playerUrl && (
        <>
          <div className="video-player-wrapper">
            {/* Previous Button - Desktop Only */}
            {detail.seasons && detail.seasons.length > 0 && getPreviousEpisode() && (
              <button 
                className="episode-nav-btn prev-episode-desktop"
                onClick={handlePreviousEpisode}
                title="Episode Sebelumnya"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            <div 
              className={`video-player-container ${detail.isDracin ? 'dracin-video' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {playerLoading && (
                <div className="player-loading-overlay">
                  <div className="loading-spinner"></div>
                </div>
              )}
              {/* Auto-play countdown overlay */}
              {autoPlayCountdown > 0 && detail?.isDracin && (
                <div className="autoplay-countdown-overlay">
                  <div className="autoplay-countdown-content">
                    <div className="autoplay-icon">⏭️</div>
                    <h3>Episode Selanjutnya</h3>
                    <p>Episode {getNextEpisode()?.episodeNumber} akan diputar dalam</p>
                    <div className="countdown-number">{autoPlayCountdown}</div>
                    <button className="cancel-autoplay-btn" onClick={cancelAutoPlay}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
              {/* Video Player - iframe (video.php has ArtPlayer built-in) */}
              <iframe
                src={playerUrl}
                className="video-player"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                frameBorder="0"
                scrolling="no"
                title="Video Player"
                onLoad={handlePlayerLoad}
              ></iframe>
            </div>
            {/* Next Button - Desktop Only */}
            {detail.seasons && detail.seasons.length > 0 && getNextEpisode() && (
              <button 
                className="episode-nav-btn next-episode-desktop"
                onClick={handleNextEpisode}
                title="Episode Selanjutnya"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
          {/* Mobile Navigation Buttons */}
          {detail.seasons && detail.seasons.length > 0 && (getPreviousEpisode() || getNextEpisode()) && (
            <div className="episode-nav-mobile">
              <button 
                className="episode-nav-btn-mobile prev-btn"
                onClick={handlePreviousEpisode}
                disabled={!getPreviousEpisode()}
              >
                <i className="fas fa-chevron-left"></i>
                <span>Previous</span>
              </button>
              <button 
                className="episode-nav-btn-mobile next-btn"
                onClick={handleNextEpisode}
                disabled={!getNextEpisode()}
              >
                <span>Next</span>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Content View */}
      {showPlayer ? (
        // Playing View - After clicking play
        <div className="detail-content-wrapper container">
          <h1 className="detail-main-title">
            {detail.title}{getEpisodeLabel()}
          </h1>

          <div className="detail-main-meta">
            {detail.year && (
              <span><i className="far fa-calendar-alt"></i> {detail.year}</span>
            )}
            {detail.rating && (
              <span><span className="star">★</span> {formatRating(detail.rating)}</span>
            )}
            {detail.country && (
              <span><i className="fas fa-globe-asia"></i> {detail.country}</span>
            )}
          </div>

          {detail.description && (
            <p className="detail-main-description">{detail.description}</p>
          )}

          {/* Native Banner Ad */}
          <NativeBanner />

          {/* Episodes Section */}
        {detail.seasons && detail.seasons.length > 0 && (
          <div className="detail-episodes-section">
            <h2><span className="episodes-bar"></span> Episodes</h2>

            {detail.seasons.length > 1 && (
              <div className="season-selector">
                {detail.seasons.map((season, index) => (
                  <button
                    key={index}
                    className={`season-button ${selectedSeason === season ? 'active' : ''}`}
                    onClick={() => handleSeasonChange(season)}
                  >
                    Season {season.seasonNumber || season.season || index + 1}
                  </button>
                ))}
              </div>
            )}

            {selectedSeason && selectedSeason.episodes && (
              <div className="episode-grid-main">
                {selectedSeason.episodes.map((episode, index) => (
                  <div
                    key={index}
                    className={`episode-card-main ${selectedEpisode === episode ? 'active' : ''}`}
                    onClick={() => handleEpisodeSelect(episode)}
                  >
                    <span className="ep-label">Episode {episode.episodeNumber || episode.episode || index + 1}</span>
                    <span className="ep-title">{episode.episodeName || episode.title || `Episode ${episode.episodeNumber || episode.episode || index + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      ) : (
        /* Detail View - Before playing */
        <>
          <div 
            className="detail-backdrop"
            style={{
              backgroundImage: `url(${detail.backdrop || detail.poster || getPlaceholderImage()})`
            }}
          >
            <div className="detail-backdrop-overlay"></div>
          </div>

          <div className="detail-content container">
            <div className="detail-info-grid">
              <div className="detail-poster">
                <img 
                  src={detail.poster || getPlaceholderImage()} 
                  alt={detail.title}
                  onError={(e) => e.target.src = getPlaceholderImage()}
                />
              </div>

              <div className="detail-info">
                <h1 className="detail-title">{detail.title}</h1>

                <div className="detail-meta">
                  {detail.rating && (
                    <span className="detail-rating">
                      <span className="star">★</span> {formatRating(detail.rating)}
                    </span>
                  )}
                  {detail.year && (
                    <span className="detail-meta-item">
                      <i className="far fa-calendar-alt"></i> {detail.year}
                    </span>
                  )}
                  {detail.releaseDate && !detail.year && (
                    <span className="detail-meta-item">
                      <i className="far fa-calendar-alt"></i> {detail.releaseDate}
                    </span>
                  )}
                  {detail.type && (
                    <span className="detail-meta-item">
                      <i className={detail.type === 'movie' ? 'fas fa-film' : 'fas fa-tv'}></i> {detail.type === 'movie' ? 'Movie' : 'Series'}
                    </span>
                  )}
                  {detail.country && (
                    <span className="detail-meta-item">
                      <i className="fas fa-globe-asia"></i> {detail.country}
                    </span>
                  )}
                  {detail.duration > 0 && detail.type === 'movie' && (
                    <span className="detail-meta-item">
                      <i className="fas fa-clock"></i> {Math.floor(detail.duration / 60)} min
                    </span>
                  )}
                </div>

                {detail.genres && detail.genres.length > 0 && (
                  <div className="detail-genres">
                    {detail.genres.map((genre, index) => (
                      <span key={index} className="genre-tag">{genre}</span>
                    ))}
                  </div>
                )}

                {!detail.genres && detail.genre && (
                  <div className="detail-genres">
                    {detail.genre.split(',').map((genre, index) => (
                      <span key={index} className="genre-tag">{genre.trim()}</span>
                    ))}
                  </div>
                )}

                {detail.description && (
                  <p className="detail-description">{detail.description}</p>
                )}

                {detail.cast && detail.cast.length > 0 && (
                  <div className="detail-extra-info">
                    <span className="detail-label">Pemeran:</span>
                    <span className="detail-value">
                      {detail.cast.map(actor => actor.name).join(', ')}
                    </span>
                  </div>
                )}

                {detail.director && (
                  <div className="detail-extra-info">
                    <span className="detail-label">Sutradara:</span>
                    <span className="detail-value">{detail.director}</span>
                  </div>
                )}

                {/* Play Button */}
                {(availablePlayerUrl || (detail.hasResource && detail.subjectId)) && (
                  <div className="detail-actions">
                    <button 
                      className="btn-play-main"
                      onClick={handlePlayClick}
                    >
                      <i className="fas fa-play"></i> Tonton Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Episodes Section */}
            {detail.seasons && detail.seasons.length > 0 && (
              <div className="episodes-section">
                <h2><i className="fas fa-list"></i> Episodes</h2>

                {detail.seasons.length > 1 && (
                  <div className="season-selector">
                    {detail.seasons.map((season, index) => (
                      <button
                        key={index}
                        className={`season-button ${selectedSeason === season ? 'active' : ''}`}
                        onClick={() => handleSeasonChange(season)}
                      >
                        Season {season.seasonNumber || season.season || index + 1}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSeason && selectedSeason.episodes && (
                  <div className="episode-grid">
                    {selectedSeason.episodes.map((episode, index) => (
                      <div
                        key={index}
                        className={`episode-card ${selectedEpisode === episode ? 'active' : ''}`}
                        onClick={() => handleEpisodeSelect(episode)}
                      >
                        <span className="episode-number">Ep {episode.episodeNumber || episode.episode || index + 1}</span>
                        <span className="episode-title">
                          {episode.episodeName || episode.title || `Episode ${episode.episodeNumber || episode.episode || index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Detail;
