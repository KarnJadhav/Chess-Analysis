import 'bootstrap/dist/css/bootstrap.min.css';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Game } from '@/models/Game';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';

type SelectedGameAnalysis = {
  moveEvals?: number[];
  accuracyWhite?: number;
  accuracyBlack?: number;
  timeline?: {
    move: number;
    eval: number;
    classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  }[];
  criticalPositions?: {
    moveNumber: number;
    classification?: 'blunder' | 'mistake' | 'inaccuracy' | string;
  }[];
  reviewedMoves?: {
    moveNumber: number;
    san: string;
    bestMove: string;
    evalBefore: number;
    evalAfter: number;
    evalDrop: number;
    side: 'white' | 'black';
    phase: 'opening' | 'middlegame' | 'endgame';
    classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
    comment: string;
  }[];
  playerSummary?: {
    white: {
      accuracy: number;
      blunders: number;
      mistakes: number;
      inaccuracies: number;
      bestMoves: number;
      greatMoves: number;
      brilliantMoves: number;
    };
    black: {
      accuracy: number;
      blunders: number;
      mistakes: number;
      inaccuracies: number;
      bestMoves: number;
      greatMoves: number;
      brilliantMoves: number;
    };
  };
  estimatedRating?: {
    white: number;
    black: number;
  };
  review?: {
    timeline?: {
      move: number;
      eval: number;
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
    }[];
    reviewedMoves?: {
      moveNumber: number;
      san: string;
      bestMove: string;
      evalBefore: number;
      evalAfter: number;
      evalDrop: number;
      side: 'white' | 'black';
      phase: 'opening' | 'middlegame' | 'endgame';
      classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
      comment: string;
    }[];
    playerSummary?: {
      white: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        bestMoves: number;
        greatMoves: number;
        brilliantMoves: number;
      };
      black: {
        accuracy: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        bestMoves: number;
        greatMoves: number;
        brilliantMoves: number;
      };
    };
    estimatedRating?: {
      white: number;
      black: number;
    };
  };
};

function normalizeEvalCpToPawns(evalCp: number): number {
  const pawns = evalCp / 100;
  return Math.max(-10, Math.min(10, pawns));
}

function getPieceUnicode(piece: { type: string; color: 'w' | 'b' }): string {
  const map: Record<string, string> = {
    p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
  };
  const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
  return map[key] || '';
}

type ViewerMove = {
  from: string;
  to: string;
  san: string;
};

const classificationColors: Record<string, string> = {
  brilliant: '#20c997',
  great: '#198754',
  best: '#0d6efd',
  excellent: '#2f80ed',
  good: '#0dcaf0',
  inaccuracy: '#ffc107',
  mistake: '#fd7e14',
  blunder: '#dc3545',
};

const classificationIcons: Record<string, string> = {
  brilliant: '!!',
  great: '!',
  best: '✓',
  excellent: '✓',
  good: '·',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

export default function Dashboard() {
  const { data: session } = useSession();
  const [pgn, setPgn] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Game list and filters
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  // Game viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [moves, setMoves] = useState<ViewerMove[]>([]);

  // Profile dropdown logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Performance metrics state
  const [metrics, setMetrics] = useState({
    gamesPlayed: 0,
    winRate: 0,
    avgAcpl: 0,
    avgBlunders: 0,
    avgAccuracy: 0,
  });

  useEffect(() => {
    async function fetchMetrics() {
      if (!session) return;
      // Fetch all analyses for user's games
      const res = await fetch('/api/games/list?analysis=true', { credentials: 'include' });
      const data = await res.json();
      const games = data.games || [];
      let wins = 0;
      let acplSum = 0;
      let blunderSum = 0;
      let accuracySum = 0;
      let analyzedGames = 0;
      games.forEach((g: Game) => {
        if (g.result === '1-0') wins++;
        if (g.analysis && typeof g.analysis.acpl === 'number') {
          acplSum += g.analysis.acpl;
          blunderSum += (g.analysis as unknown as { blunders?: unknown[] }).blunders?.length || 0;
          accuracySum += (g.analysis as unknown as { accuracy?: number }).accuracy ?? 0;
          analyzedGames++;
        }
      });
      setMetrics({
        gamesPlayed: games.length,
        winRate: games.length ? Math.round((wins / games.length) * 100) : 0,
        avgAcpl: analyzedGames ? Math.round(acplSum / analyzedGames) : 0,
        avgBlunders: analyzedGames ? Math.round(blunderSum / analyzedGames) : 0,
        avgAccuracy: analyzedGames ? Math.round(accuracySum / analyzedGames) : 0,
      });
    }
    fetchMetrics();
  }, [session, games]);

  useEffect(() => {
    async function fetchGames() {
      setLoadingGames(true);
      let query = '';
      if (search) query += `search=${encodeURIComponent(search)}`;
      if (dateFilter) query += `${query ? '&' : ''}date=${encodeURIComponent(dateFilter)}`;
      if (resultFilter) query += `${query ? '&' : ''}result=${encodeURIComponent(resultFilter)}`;
      const res = await fetch(`/api/games/list${query ? '?' + query : ''}`, { credentials: 'include' });
      const data = await res.json();
      setGames(data.games || []);
      setLoadingGames(false);
    }
    if (session) fetchGames();
  }, [session, search, dateFilter, resultFilter]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  if (!session) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100 bg-primary text-white fw-bold fs-4">You must be signed in to view this page.</div>;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setUploading(true);
    setMessage('');
    const res = await fetch('/api/games/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgn }),
      credentials: 'include',
    });
    const data = await res.json();
    setUploading(false);
    if (data.error) {
      setMessage(data.error);
      return;
    }
    setMessage('Game uploaded and analysis started!');
    setAnalyzing(true);
    const uploadedGameId = typeof data.gameId === 'string' ? data.gameId : undefined;
    // Poll for analysis completion
    const pollAnalysis = async () => {
      const gamesRes = await fetch('/api/games/list?analysis=true', { credentials: 'include' });
      const gamesData = await gamesRes.json();
      const trackedGame = uploadedGameId
        ? (gamesData.games || []).find((game: Game) => game._id === uploadedGameId)
        : gamesData.games && gamesData.games[0];

      if (trackedGame && trackedGame.analysisComplete) {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setAnalyzing(false);
        setGames(gamesData.games);
        setMessage('Analysis complete! Suggestions updated.');
      } else if (trackedGame && trackedGame.analysisStatus === 'failed') {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setAnalyzing(false);
        setGames(gamesData.games);
        setMessage(
          `Analysis failed: ${trackedGame.analysisError || 'Stockfish engine unavailable. Check STOCKFISH_PATH.'}`
        );
      } else {
        setGames(gamesData.games);
        pollTimerRef.current = setTimeout(pollAnalysis, 4000);
      }
    };
    pollAnalysis();
  }

  // Deduplicate suggestions using Set to avoid repeats
  const uniqueSuggestions = [...new Set(games.flatMap((g: Game) => (g.analysis as unknown as { suggestions?: string[] })?.suggestions || []))];

  const selectedAnalysis = (selectedGame?.analysis as SelectedGameAnalysis | undefined) ?? undefined;
  const reviewTimeline = selectedAnalysis?.review?.timeline ?? selectedAnalysis?.timeline ?? [];
  const reviewedMoves = selectedAnalysis?.review?.reviewedMoves ?? selectedAnalysis?.reviewedMoves ?? [];
  const playerSummary = selectedAnalysis?.review?.playerSummary ?? selectedAnalysis?.playerSummary;
  const estimatedRating = selectedAnalysis?.review?.estimatedRating ?? selectedAnalysis?.estimatedRating;

  const chartData = reviewTimeline.length > 0
    ? reviewTimeline.map((point) => ({
      move: point.move,
      eval: normalizeEvalCpToPawns(point.eval),
      classification: point.classification,
      dotColor: classificationColors[point.classification] ?? '#0d6efd',
    }))
    : (selectedAnalysis?.moveEvals ?? []).map((evalScore, index) => ({
      move: index + 1,
      eval: normalizeEvalCpToPawns(evalScore),
      classification: 'good',
      dotColor: classificationColors.good,
    }));

  const activeReviewedMove = moveIndex > 0 ? reviewedMoves[moveIndex - 1] : undefined;
  const whiteName = session?.user?.name || session?.user?.email || 'White';
  const blackName = selectedGame?.opponent || 'Black';

  function initialsFromName(name: string): string {
    const chunks = name.split(/\s+/).filter(Boolean);
    if (chunks.length === 0) return 'U';
    if (chunks.length === 1) return chunks[0].slice(0, 1).toUpperCase();
    return (chunks[0][0] + chunks[1][0]).toUpperCase();
  }

  const boardSquares = (() => {
    if (!selectedGame) {
      return [] as {
        piece: { type: string; color: 'w' | 'b' } | null;
        square: string;
      }[];
    }

    const tempChess = new Chess();
    try {
      tempChess.loadPgn(selectedGame.pgn);
    } catch (err) {
      console.error('PGN load error:', selectedGame.pgn, err);
    }

    tempChess.reset();
    for (let i = 0; i < moveIndex; i++) {
      tempChess.move(moves[i]?.san);
    }

    const board = tempChess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const squares: {
      piece: { type: string; color: 'w' | 'b' } | null;
      square: string;
    }[] = [];

    for (let renderRow = 0; renderRow < 8; renderRow++) {
      for (let renderCol = 0; renderCol < 8; renderCol++) {
        const sourceRow = isFlipped ? 7 - renderRow : renderRow;
        const sourceCol = isFlipped ? 7 - renderCol : renderCol;
        const piece = board[sourceRow][sourceCol];
        const square = `${files[sourceCol]}${8 - sourceRow}`;

        squares.push({
          piece: piece ? { type: piece.type, color: piece.color } : null,
          square,
        });
      }
    }

    return squares;
  })();

  const lastMove = moveIndex > 0 ? moves[moveIndex - 1] : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPgn(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPgn(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  // Wrap all dashboard JSX in a single parent element
  return (
    <div className="dashboard-root">
      {/* Analysis Progress Bar */}
      {analyzing && (
        <div className="progress my-3" style={{ height: 24 }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-info" style={{ width: '100%' }}>
            Analyzing game... Please wait
          </div>
        </div>
      )}
      {/* Profile Dropdown */}
      <div className="d-flex justify-content-end mb-4">
        <div className="position-relative" ref={dropdownRef}>
          <button
            className="btn btn-outline-primary fw-semibold rounded-pill px-4 py-2"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            {session?.user?.email || 'Profile'} <span className="ms-2">▼</span>
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu show position-absolute end-0 mt-2 shadow rounded-3 p-3" style={{ minWidth: 220, zIndex: 100 }}>
              <div className="fw-semibold mb-2">Signed in as:</div>
              <div className="mb-3 text-break text-primary fw-bold">{session?.user?.email}</div>
              <button className="btn btn-outline-danger w-100 fw-semibold" onClick={() => signOut()}>Logout</button>
            </div>
          )}
        </div>
      </div>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            {/* Upload & Analyze Game */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Upload & Analyze Game</h2>
              <form onSubmit={handleUpload}>
                <div
                  className={`mb-3 border rounded-3 p-3 text-center ${dragActive ? 'bg-light border-primary' : 'bg-white'}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="file"
                    id="pgnFile"
                    accept=".pgn"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <label htmlFor="pgnFile" className="fw-semibold text-secondary" style={{ cursor: 'pointer' }}>
                    Drag & drop PGN file here or <span className="text-primary text-decoration-underline">choose file</span>
                  </label>
                </div>
                <label className="form-label fw-semibold">Or paste PGN</label>
                <textarea className="form-control mb-3" rows={6} value={pgn} onChange={e => setPgn(e.target.value)} required />
                <button className="btn btn-primary w-100 py-2 fw-bold" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Analyze'}</button>
              </form>
              {message && <div className="text-success fw-semibold text-center mt-3">{message}</div>}
            </div>
            {/* Game List */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Game List</h2>
              <div className="row mb-3">
                <div className="col-md-4 mb-2 mb-md-0">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by opponent, opening..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4 mb-2 mb-md-0">
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={resultFilter}
                    onChange={e => setResultFilter(e.target.value)}
                  >
                    <option value="">All Results</option>
                    <option value="1-0">Win</option>
                    <option value="1/2-1/2">Draw</option>
                    <option value="0-1">Loss</option>
                  </select>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      <th>Result</th>
                      <th>Opening</th>
                      <th>Analysis</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGames ? (
                      <tr><td colSpan={6} className="text-center">Loading...</td></tr>
                    ) : games.length === 0 ? (
                      <tr><td colSpan={6} className="text-center">No games found.</td></tr>
                    ) : (
                      games.map((game: Game) => (
                        <tr key={game._id}>
                          <td>{game.date ? new Date(game.date).toLocaleDateString() : ''}</td>
                          <td>{game.opponent}</td>
                          <td>{game.result}</td>
                          <td>{game.opening || '-'}</td>
                          <td>{game.analysisComplete ? 'Analyzed' : 'Pending'}</td>
                          <td>
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => {
                                setSelectedGame(game);
                                const chessInstance = new Chess();
                                try {
                                  chessInstance.loadPgn(game.pgn);
                                } catch (err) {
                                  console.error('PGN load error:', game.pgn, err);
                                }
                                // Ensure moves are extracted from PGN
                                const allMoves = chessInstance.history({ verbose: true }).map((m) => ({
                                  from: m.from,
                                  to: m.to,
                                  san: m.san,
                                }));
                                setMoves(allMoves);
                                setMoveIndex(0);
                                setIsFlipped(false);
                                setViewerOpen(true);
                              }}
                            >View</button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this game?')) return;
                                const res = await fetch(`/api/games/delete?id=${game._id}`, { method: 'DELETE', credentials: 'include' });
                                if (res.ok) {
                                  setGames(games.filter((g: Game) => g._id !== game._id));
                                } else {
                                  alert('Failed to delete game.');
                                }
                              }}
                            >Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Game Viewer Modal */}
            {viewerOpen && selectedGame && (
              <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Game Viewer</h5>
                      <button type="button" className="btn-close" onClick={() => setViewerOpen(false)}></button>
                    </div>
                    <div className="modal-body">
                      <div className="viewer-container">
                        <div className="board-container">
                          <div className="chess-board">
                            {boardSquares.map((squareData, index) => {
                              const isLight = (Math.floor(index / 8) + (index % 8)) % 2 === 0;
                              const isLastMoveSquare =
                                !!lastMove && (squareData.square === lastMove.from || squareData.square === lastMove.to);

                              return (
                                <div
                                  key={index}
                                  className="square"
                                  style={{
                                    backgroundColor: isLastMoveSquare ? '#f7ec59' : (isLight ? '#f0d9b5' : '#b58863'),
                                  }}
                                >
                                  {squareData.piece ? getPieceUnicode(squareData.piece) : ''}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="info-container">
                          <div className="game-info">
                            <div className="mb-2 fw-semibold">Opponent: {selectedGame.opponent}</div>
                            <div className="mb-2 fw-semibold">Result: {selectedGame.result}</div>
                            <div className="mb-2 fw-semibold">Opening: {selectedGame.opening}</div>
                            <div className="mb-2 fw-semibold">Date: {selectedGame.date ? new Date(selectedGame.date).toLocaleDateString() : ''}</div>
                          </div>

                          <div className="review-summary bg-light rounded-3 p-3 border">
                            <div className="fw-semibold mb-2">Game Review</div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                  {initialsFromName(whiteName)}
                                </div>
                                <div>
                                  <div className="fw-semibold">{whiteName}</div>
                                  <div className="small text-muted">White</div>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-success">{playerSummary?.white.accuracy ?? selectedAnalysis?.accuracyWhite ?? '-'}%</div>
                                <div className="small text-muted">Rating: {estimatedRating?.white ?? '-'}</div>
                              </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                  {initialsFromName(blackName)}
                                </div>
                                <div>
                                  <div className="fw-semibold">{blackName}</div>
                                  <div className="small text-muted">Black</div>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-success">{playerSummary?.black.accuracy ?? selectedAnalysis?.accuracyBlack ?? '-'}%</div>
                                <div className="small text-muted">Rating: {estimatedRating?.black ?? '-'}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-1">
                            <button className="btn btn-outline-secondary me-2" disabled={moveIndex === 0} onClick={() => setMoveIndex(0)}>⏮️</button>
                            <button className="btn btn-outline-secondary me-2" disabled={moveIndex === 0} onClick={() => setMoveIndex(moveIndex - 1)}>◀️</button>
                            <span className="fw-bold">Move {moveIndex} / {moves.length}</span>
                            <button className="btn btn-outline-secondary ms-2" disabled={moveIndex === moves.length} onClick={() => setMoveIndex(moveIndex + 1)}>▶️</button>
                            <button className="btn btn-outline-secondary ms-2" disabled={moveIndex === moves.length} onClick={() => setMoveIndex(moves.length)}>⏭️</button>
                            <button className="btn btn-outline-primary ms-2 mt-2 mt-lg-0" onClick={() => setIsFlipped((v) => !v)}>
                              {isFlipped ? 'White View' : 'Black View'}
                            </button>
                          </div>

                          <div className="moves-list">
                            <ol className="mb-0">
                              {moves.map((move, idx) => {
                                const moveNumber = Math.floor(idx / 2) + 1;
                                const isWhite = idx % 2 === 0;
                                const notation = `${isWhite ? moveNumber + '.' : ''} ${move.san}`;
                                const reviewMove = reviewedMoves[idx];
                                const icon = classificationIcons[reviewMove?.classification ?? 'good'] ?? '·';
                                const iconColor = classificationColors[reviewMove?.classification ?? 'good'] ?? '#0d6efd';
                                return (
                                  <li key={idx} className={idx === moveIndex - 1 ? 'fw-bold text-primary' : ''}>
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-decoration-none"
                                      onClick={() => setMoveIndex(idx + 1)}
                                    >
                                      <span className="me-2 fw-bold" style={{ color: iconColor }}>{icon}</span>
                                      <span className="text-dark">{notation}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>

                          <div className="bg-white border rounded-3 p-2">
                            <div className="fw-semibold mb-1">Move Insight</div>
                            {activeReviewedMove ? (
                              <>
                                <div className="small mb-1">
                                  <span className="badge bg-secondary me-2">{activeReviewedMove.phase}</span>
                                  <span className="badge" style={{ backgroundColor: classificationColors[activeReviewedMove.classification] ?? '#6c757d' }}>
                                    {activeReviewedMove.classification}
                                  </span>
                                </div>
                                <div className="small text-muted mb-1">Best move: {activeReviewedMove.bestMove} | Eval drop: {activeReviewedMove.evalDrop} cp</div>
                                <div className="small">{activeReviewedMove.comment}</div>
                              </>
                            ) : (
                              <div className="small text-muted">Select a move to see review feedback.</div>
                            )}
                          </div>

                          <div className="graph bg-light rounded-3 p-3 shadow-sm">
                            <span className="fw-semibold">Evaluation Graph</span>
                            {chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="move" />
                                  <YAxis domain={[-10, 10]} />
                                  <ReferenceLine y={0} stroke="#6c757d" strokeDasharray="4 4" />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="eval" stroke="#0d6efd" strokeWidth={2} dot={false} />
                                  {chartData.map((point) => (
                                    <ReferenceDot
                                      key={`review-${point.move}`}
                                      x={point.move}
                                      y={point.eval}
                                      r={4}
                                      fill={point.dotColor}
                                      stroke={point.dotColor}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="text-muted mt-2">No evaluation data available yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Performance Metrics */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Performance Metrics</h2>
              <div className="row text-center">
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.gamesPlayed}</div>
                  <div className="text-secondary">Games Played</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.winRate}%</div>
                  <div className="text-secondary">Win Rate</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.avgAcpl}</div>
                  <div className="text-secondary">Avg ACPL</div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="fw-bold fs-4">{metrics.avgBlunders}</div>
                  <div className="text-secondary">Blunders/Game</div>
                </div>
              </div>
              <div className="row text-center">
                <div className="col-12 mb-2">
                  <div className="fw-bold fs-4">{metrics.avgAccuracy}%</div>
                  <div className="text-secondary">Avg Accuracy</div>
                </div>
              </div>
            </div>
            {/* Analytics & Suggestions */}
            <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 mb-4">
              <h2 className="fw-bold mb-4 text-primary text-center">Analytics & Suggestions</h2>
              <div className="row">
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-info bg-opacity-10 border border-info rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-info mb-3">📊 ACPL & Blunders</h5>
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No games analyzed yet.</li>
                      ) : (
                        games.map((g: Game, idx: number) => (
                          <li key={idx} className="mb-2">
                            <strong>Game {idx + 1}:</strong> ACPL: <span className="text-danger fw-bold">{(g.analysis as unknown as { acpl?: number })?.acpl ?? '-'}</span>, Accuracy: <span className="text-success fw-bold">{(g.analysis as unknown as { accuracy?: number })?.accuracy ?? '-'}%</span>, Blunders: <span className="text-warning fw-bold">{((g.analysis as unknown as { blunders?: unknown[] })?.blunders?.length) ?? 0}</span>
                            <div className="small text-muted">
                              White: {(g.analysis as unknown as { accuracyWhite?: number })?.accuracyWhite ?? '-'}% | Black: {(g.analysis as unknown as { accuracyBlack?: number })?.accuracyBlack ?? '-'}%
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-success bg-opacity-10 border border-success rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-success mb-3">💡 Suggestions</h5>
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No suggestions yet.</li>
                      ) : uniqueSuggestions.length === 0 ? (
                        <li className="text-muted">No suggestions yet.</li>
                      ) : (
                        uniqueSuggestions.map((s: string, idx: number) => (
                          <li key={idx} className="mb-2">✓ {s}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <div className="bg-warning bg-opacity-10 border border-warning rounded-3 p-4 shadow-sm" style={{ minHeight: '200px' }}>
                    <h5 className="fw-bold text-warning mb-3">🏁 Endgame Insights</h5>
                    <ul className="mb-0 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {games.length === 0 ? (
                        <li className="text-muted">No endgame insights yet.</li>
                      ) : (
                        games.map((g: Game, idx: number) => (
                          <li key={idx} className="mb-2">
                            Game {idx + 1}: {(g.analysis as unknown as { endgameReached?: boolean })?.endgameReached ? <span className="badge bg-warning text-dark">Endgame reached</span> : <span className="badge bg-secondary">No endgame</span>}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              {/* Chart placeholders for ACPL and blunders over time */}
              <div className="row mt-4">
                <div className="col-12 col-md-6 mb-3">
                  <div className="bg-primary bg-opacity-5 border border-primary rounded-3 p-4 shadow-sm">
                    <h5 className="fw-bold text-primary mb-3">📈 ACPL Over Time</h5>
                    <div style={{ height: 200 }} className="d-flex align-items-center justify-content-center bg-white rounded-2 text-muted">[Chart Coming Soon]</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 mb-3">
                  <div className="bg-danger bg-opacity-5 border border-danger rounded-3 p-4 shadow-sm">
                    <h5 className="fw-bold text-danger mb-3">📉 Blunders Over Time</h5>
                    <div style={{ height: 200 }} className="d-flex align-items-center justify-content-center bg-white rounded-2 text-muted">[Chart Coming Soon]</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
