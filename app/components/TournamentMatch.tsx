'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MatchChat from './MatchChat'

interface TournamentMatchProps {
  matchId: string
  opponent: {
    id: string
    preferences: {
      island: string
      connection: 'wired' | 'wireless'
      rules: {
        stock: number
        time: number
        items: boolean
        stageHazards: boolean
      }
    }
  }
  onLeaveMatch: () => void
  playerIndex: number | null // 0 for player1, 1 for player2, null if not assigned yet
  // Matchmaking functions passed as props
  selectCharacter: (matchId: string, character: string) => Promise<void>
  banStage: (matchId: string, stage: string) => Promise<void>
  pickStage: (matchId: string, stage: string) => Promise<void>
  reportGameResult: (matchId: string, winner: number) => Promise<void>
  matchStatus: any // Pass matchStatus as prop instead of callback
  matchEnded?: boolean
}

type MatchStatus = 'character_selection' | 'stage_striking' | 'active' | 'completed'

const STARTER_STAGES = [
  'Battlefield',
  'Final Destination', 
  'Small Battlefield',
  'Pokemon Stadium 2',
  'Hallow Bastion'
]

const COUNTERPICK_STAGES = [
  'Smashville',
  'Town & City'
]

const ALL_STAGES = [...STARTER_STAGES, ...COUNTERPICK_STAGES]

const CHARACTERS = [
  'Mario', 'Donkey Kong', 'Link', 'Samus', 'Dark Samus', 'Yoshi', 'Kirby', 'Fox',
  'Pikachu', 'Luigi', 'Ness', 'Captain Falcon', 'Jigglypuff', 'Peach', 'Daisy',
  'Bowser', 'Ice Climbers', 'Sheik', 'Zelda', 'Dr. Mario', 'Pichu', 'Falco',
  'Marth', 'Lucina', 'Young Link', 'Ganondorf', 'Mewtwo', 'Roy', 'Chrom',
  'Mr. Game & Watch', 'Meta Knight', 'Pit', 'Dark Pit', 'Zero Suit Samus',
  'Wario', 'Snake', 'Ike', 'Pokemon Trainer', 'Diddy Kong', 'Lucas', 'Sonic',
  'King Dedede', 'Olimar', 'Lucario', 'R.O.B.', 'Toon Link', 'Wolf', 'Villager',
  'Mega Man', 'Wii Fit Trainer', 'Rosalina & Luma', 'Little Mac', 'Greninja',
  'Mii Brawler', 'Mii Swordfighter', 'Mii Gunner', 'Palutena', 'Pac-Man',
  'Robin', 'Shulk', 'Bowser Jr.', 'Duck Hunt', 'Ryu', 'Ken', 'Cloud',
  'Corrin', 'Bayonetta', 'Inkling', 'Ridley', 'Simon', 'Richter', 'King K. Rool',
  'Isabelle', 'Incineroar', 'Piranha Plant', 'Joker', 'Hero', 'Banjo & Kazooie',
  'Terry', 'Byleth', 'Min Min', 'Steve', 'Sephiroth', 'Pyra/Mythra',
  'Kazuya', 'Sora'
]

export default function TournamentMatch({ matchId, opponent, onLeaveMatch, playerIndex, selectCharacter, banStage, pickStage, reportGameResult, matchStatus, matchEnded }: TournamentMatchProps) {
  const { data: session } = useSession()
  const [matchStatusState, setMatchStatusState] = useState<MatchStatus>('character_selection')
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')
  const [confirmedCharacter, setConfirmedCharacter] = useState<string>('')
  const [characterSearchTerm, setCharacterSearchTerm] = useState<string>('')
  const [player1Character, setPlayer1Character] = useState<string>('')
  const [player2Character, setPlayer2Character] = useState<string>('')
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)
  const [strikesRemaining, setStrikesRemaining] = useState<number>(3)
  const [availableStages, setAvailableStages] = useState<string[]>(STARTER_STAGES)
  const [bannedStages, setBannedStages] = useState<string[]>([])
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [currentGame, setCurrentGame] = useState<number>(1)
  const [player1Score, setPlayer1Score] = useState<number>(0)
  const [player2Score, setPlayer2Score] = useState<number>(0)
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false)
  const [showChat, setShowChat] = useState(true)
  const [isBanningStage, setIsBanningStage] = useState<boolean>(false)
  const [isPickingStage, setIsPickingStage] = useState<boolean>(false)
  const [isReportingResult, setIsReportingResult] = useState<boolean>(false)
  const [opponentLeft, setOpponentLeft] = useState<boolean>(false)
  
  // Game result validation state
  const [gameResultPending, setGameResultPending] = useState<boolean>(false)
  const [gameResultConflict, setGameResultConflict] = useState<boolean>(false)
  const [pendingResult, setPendingResult] = useState<{reportedBy: number, winner: number} | null>(null)
  const [conflictResult, setConflictResult] = useState<{player1Reported: number, player2Reported: number} | null>(null)

  // Extract character selection data from matchStatus
  const player1CharacterFromStatus = matchStatus?.character_selection?.player1Character || ''
  const player2CharacterFromStatus = matchStatus?.character_selection?.player2Character || ''
  const bothReadyFromStatus = matchStatus?.character_selection?.bothReady || false
  
  console.log('MatchStatus debug:', {
    matchStatus,
    character_selection: matchStatus?.character_selection,
    player1CharacterFromStatus,
    player2CharacterFromStatus,
    bothReadyFromStatus
  })

  useEffect(() => {
    // Handle matchStatus updates
    if (matchStatus) {
      console.log('Tournament match status update:', matchStatus)
      
      if (matchStatus.type === 'match_state') {
        if (matchStatus.status && ['character_selection', 'stage_striking', 'active', 'completed'].includes(matchStatus.status)) {
          setMatchStatusState(matchStatus.status as MatchStatus)
          console.log(`Match status changed to: ${matchStatus.status}`)
          
          // Clear game result validation state when transitioning to a new game
          if (matchStatus.status === 'stage_striking' || matchStatus.status === 'active') {
            setGameResultPending(false)
            setGameResultConflict(false)
            setPendingResult(null)
            setConflictResult(null)
            console.log('Cleared game result validation state for new game')
          }
        }
        if (matchStatus.selectedStage) setSelectedStage(matchStatus.selectedStage)
        if (matchStatus.currentGame) setCurrentGame(matchStatus.currentGame)
        if (matchStatus.player1Score !== undefined) setPlayer1Score(matchStatus.player1Score)
        if (matchStatus.player2Score !== undefined) setPlayer2Score(matchStatus.player2Score)
        if (matchStatus.currentPlayer !== undefined && playerIndex !== null) {
          setCurrentPlayer(matchStatus.currentPlayer)
          // Determine if it's my turn based on playerIndex
          setIsMyTurn(matchStatus.currentPlayer === playerIndex)
        }
        if (matchStatus.strikesRemaining !== undefined) setStrikesRemaining(matchStatus.strikesRemaining)
        if (matchStatus.availableStages) setAvailableStages(matchStatus.availableStages)
        if (matchStatus.bannedStages) setBannedStages(matchStatus.bannedStages)
        // Handle character selection updates from match_state
        if (matchStatus.player1Character) {
          console.log('Setting player1Character:', matchStatus.player1Character)
          setPlayer1Character(matchStatus.player1Character)
        }
        if (matchStatus.player2Character) {
          console.log('Setting player2Character:', matchStatus.player2Character)
          setPlayer2Character(matchStatus.player2Character)
        }
        
        // Check if both characters are selected and we should transition
        if (matchStatus.player1Character && matchStatus.player2Character && matchStatus.status === 'character_selection') {
          console.log('Both characters selected but still in character_selection, checking for transition...')
        }
      } else if (matchStatus.type === 'character_selection_update') {
        if (matchStatus.player1Character) {
          console.log('Character selection update - player1Character:', matchStatus.player1Character)
          setPlayer1Character(matchStatus.player1Character)
        }
        if (matchStatus.player2Character) {
          console.log('Character selection update - player2Character:', matchStatus.player2Character)
          setPlayer2Character(matchStatus.player2Character)
        }
      } else if (matchStatus.type === 'stage_striking_update') {
        if (matchStatus.currentPlayer !== undefined && playerIndex !== null) {
          setCurrentPlayer(matchStatus.currentPlayer)
          setIsMyTurn(matchStatus.currentPlayer === playerIndex)
          console.log(`Stage striking update: currentPlayer=${matchStatus.currentPlayer}, playerIndex=${playerIndex}, isMyTurn=${matchStatus.currentPlayer === playerIndex}`)
        }
        if (matchStatus.strikesRemaining !== undefined) {
          setStrikesRemaining(matchStatus.strikesRemaining)
          console.log(`Strikes remaining updated: ${matchStatus.strikesRemaining}`)
        }
        if (matchStatus.availableStages) setAvailableStages(matchStatus.availableStages)
        if (matchStatus.bannedStages) setBannedStages(matchStatus.bannedStages)
      } else if (matchStatus.type === 'match_complete') {
        setMatchStatusState('completed')
        // Update final scores from the match complete message
        if (matchStatus.finalScore) {
          setPlayer1Score(matchStatus.finalScore.player1)
          setPlayer2Score(matchStatus.finalScore.player2)
          console.log(`Match complete! Final score: ${matchStatus.finalScore.player1} - ${matchStatus.finalScore.player2}`)
        }
        // Clear any pending validation state
        setGameResultPending(false)
        setGameResultConflict(false)
        setPendingResult(null)
        setConflictResult(null)
        if (opponentLeft) setShowChat(true)
      } else if (matchStatus.type === 'game_result_pending') {
        setGameResultPending(true)
        setGameResultConflict(false)
        if (matchStatus.reportedBy !== undefined && matchStatus.winner !== undefined) {
          setPendingResult({
            reportedBy: matchStatus.reportedBy,
            winner: matchStatus.winner
          })
          console.log(`Game result pending: Player ${matchStatus.reportedBy + 1} reported Player ${matchStatus.winner} won`)
        }
      } else if (matchStatus.type === 'game_result_conflict') {
        setGameResultConflict(true)
        setGameResultPending(false)
        if (matchStatus.player1Reported !== undefined && matchStatus.player2Reported !== undefined) {
          setConflictResult({
            player1Reported: matchStatus.player1Reported,
            player2Reported: matchStatus.player2Reported
          })
          console.log(`Game result conflict: Player 1 reported ${matchStatus.player1Reported}, Player 2 reported ${matchStatus.player2Reported}`)
        }
      } else if (matchStatus.type === 'match_reset') {
        // Handle match reset - this will be handled by the parent component
        console.log('Match reset received in TournamentMatch')
      } else if (matchStatus.type === 'opponent_left') {
        // Auto-open chat when opponent leaves
        setShowChat(true)
        setOpponentLeft(true)
        // Add system message to chat
        addSystemMessageToChat('Your opponent has left the match.')
      }
    }
  }, [matchStatus, playerIndex]) // Add matchStatus to dependency array

  // Monitor character selection state and force transition if needed
  useEffect(() => {
    const bothPicked = player1Character && player2Character
    console.log('Character selection state check:')
    console.log('- player1Character:', player1Character)
    console.log('- player2Character:', player2Character)
    console.log('- bothPicked:', bothPicked)
    console.log('- matchStatusState:', matchStatusState)
    
    if (bothPicked && matchStatusState === 'character_selection') {
      console.log('Both characters selected but still in character_selection state, forcing transition to stage_striking')
      setMatchStatusState('stage_striking')
    }
  }, [player1Character, player2Character, matchStatusState])

  const handleCharacterSelect = (character: string) => {
    setSelectedCharacter(character)
  }

  const handleConfirmCharacter = () => {
    if (selectedCharacter) {
      setConfirmedCharacter(selectedCharacter)
      selectCharacter(matchId, selectedCharacter)
    }
  }

  const handleStageBan = (stage: string) => {
    if (!isMyTurn || isBanningStage) {
      console.log(`Not my turn to ban or already banning. isMyTurn=${isMyTurn}, isBanningStage=${isBanningStage}, currentPlayer=${currentPlayer}, playerIndex=${playerIndex}`)
      return
    }
    console.log(`Banning stage: ${stage}. Current state: strikesRemaining=${strikesRemaining}, currentPlayer=${currentPlayer}, playerIndex=${playerIndex}`)
    setIsBanningStage(true)
    banStage(matchId, stage).finally(() => {
      setIsBanningStage(false)
    })
  }

  const handleStagePick = (stage: string) => {
    if (!isMyTurn || isPickingStage) return
    setIsPickingStage(true)
    pickStage(matchId, stage).finally(() => {
      setIsPickingStage(false)
    })
  }

  const handleGameResult = (winner: number) => {
    if (isReportingResult) return
    setIsReportingResult(true)
    reportGameResult(matchId, winner).finally(() => {
      setIsReportingResult(false)
    })
  }

  // Function to add system message to chat
  const addSystemMessageToChat = (message: string) => {
    // This will be handled by the MatchChat component through the opponentLeft prop
    console.log('Opponent left, system message:', message)
  }

  const renderCharacterSelection = () => {
    // Blind pick logic
    const bothPicked = player1Character && player2Character
    const myChar = playerIndex === 0 ? player1Character : playerIndex === 1 ? player2Character : null
    const oppChar = playerIndex === 0 ? player2Character : playerIndex === 1 ? player1Character : null
    
    // Filter characters based on search term
    const filteredCharacters = CHARACTERS.filter(character =>
      character.toLowerCase().includes(characterSearchTerm.toLowerCase())
    )
    
    console.log('Character selection render:')
    console.log('- PlayerIndex:', playerIndex)
    console.log('- player1Character:', player1Character)
    console.log('- player2Character:', player2Character)
    console.log('- bothPicked:', bothPicked)
    console.log('- myChar:', myChar)
    console.log('- oppChar:', oppChar)
    console.log('- confirmedCharacter:', confirmedCharacter)
    console.log('- matchStatusState:', matchStatusState)
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4">Character Selection</h2>
        
        {/* Search Bar */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Characters
          </label>
          <input
            type="text"
            placeholder="Search characters..."
            value={characterSearchTerm}
            onChange={(e) => {
              console.log('Search input changed:', e.target.value)
              setCharacterSearchTerm(e.target.value)
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Character Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-96 overflow-y-auto mb-4">
          {filteredCharacters.length > 0 ? (
            filteredCharacters.map((character) => (
              <button
                key={character}
                onClick={() => handleCharacterSelect(character)}
                className={`p-2 text-xs sm:text-sm border rounded ${
                  selectedCharacter === character
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                }`}
              >
                {character}
              </button>
            ))
          ) : (
            <div className="col-span-3 sm:col-span-4 md:col-span-6 text-center py-8 text-gray-500">
              No characters found matching "{characterSearchTerm}"
            </div>
          )}
        </div>
        
        {/* Confirmation Button */}
        {selectedCharacter && !confirmedCharacter && (
          <div className="mb-4">
            <button
              onClick={handleConfirmCharacter}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
            >
              Confirm {selectedCharacter}
            </button>
          </div>
        )}
        
        {/* Status Display */}
        <div className="mt-4 text-sm text-gray-600">
          <p>Your Pick: {myChar || (confirmedCharacter ? 'Confirmed' : 'Selecting...')}</p>
          <p>Opponent: {bothPicked ? oppChar : 'Selecting...'}</p>
          {confirmedCharacter && !myChar && (
            <p className="text-blue-600">Waiting for opponent to select their character...</p>
          )}
          {playerIndex === null && (
            <p className="text-yellow-600">Waiting for player assignment...</p>
          )}
          {bothPicked && matchStatusState === 'character_selection' && (
            <p className="text-orange-600">Both characters selected! Waiting for stage transition...</p>
          )}
        </div>
      </div>
    )
  }

  const renderStageStriking = () => {
    const isGame1 = currentGame === 1
    const stagePool = isGame1 ? STARTER_STAGES : ALL_STAGES
    
    // Determine what phase we're in and what to display
    let turnDescription = ''
    if (isGame1) {
      if (currentPlayer === 0 && strikesRemaining > 0) {
        turnDescription = 'Your turn to ban 1 stage'
      } else if (currentPlayer === 1 && strikesRemaining > 0) {
        turnDescription = 'Opponent is banning 2 stages'
      } else if (currentPlayer === 0 && strikesRemaining === 0) {
        turnDescription = 'Your turn to pick from remaining stages'
      } else if (currentPlayer === 1 && strikesRemaining === 0) {
        turnDescription = 'Opponent is picking from remaining stages'
      }
    } else {
      // Counterpicks
      const winner = player1Score > player2Score ? 0 : 1
      const isWinner = playerIndex === winner
      
      if (strikesRemaining > 0) {
        if (isWinner && isMyTurn) {
          turnDescription = 'Your turn to ban 2 stages (you won the last game)'
        } else if (isWinner && !isMyTurn) {
          turnDescription = 'Opponent is banning 2 stages (they won the last game)'
        } else {
          turnDescription = 'Winner is banning 2 stages'
        }
      } else {
        if (!isWinner && isMyTurn) {
          turnDescription = 'Your turn to pick from remaining stages (you lost the last game)'
        } else if (!isWinner && !isMyTurn) {
          turnDescription = 'Opponent is picking from remaining stages (they lost the last game)'
        } else {
          turnDescription = 'Loser is picking from remaining stages'
        }
      }
    }
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4">Stage Striking - Game {currentGame}</h2>
        
        {/* Player Indicators */}
        {playerIndex !== null && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <div className={`flex items-center space-x-2 ${playerIndex === 0 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Player 1 {playerIndex === 0 ? '(You)' : '(Opponent)'}</span>
              </div>
              <div className={`flex items-center space-x-2 ${playerIndex === 1 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Player 2 {playerIndex === 1 ? '(You)' : '(Opponent)'}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {isGame1 ? 'Starter Stages' : 'All Stages (including counterpicks)'} - {strikesRemaining} strikes remaining
          </p>
          <p className="text-sm text-gray-600">
            {turnDescription}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Available Stages</h3>
            <div className="space-y-2">
              {availableStages.map((stage) => {
                const isStarter = STARTER_STAGES.includes(stage)
                const isCounterpick = COUNTERPICK_STAGES.includes(stage)
                const isPickingPhase = strikesRemaining === 0
                
                return (
                  <button
                    key={stage}
                    onClick={() => isPickingPhase ? handleStagePick(stage) : handleStageBan(stage)}
                    disabled={!isMyTurn || isBanningStage || isPickingStage}
                    className={`w-full p-2 text-left border rounded ${
                      isMyTurn && !isBanningStage && !isPickingStage
                        ? isPickingPhase 
                          ? 'bg-green-50 hover:bg-green-100 border-green-300'
                          : 'bg-red-50 hover:bg-red-100 border-red-300'
                        : 'bg-gray-50 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{stage}</span>
                      <div className="flex items-center space-x-2">
                        {isPickingPhase && isMyTurn && !isPickingStage && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Pick
                          </span>
                        )}
                        {!isPickingPhase && isMyTurn && !isBanningStage && (
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                            Ban
                          </span>
                        )}
                        {(isBanningStage || isPickingStage) && (
                          <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                            Processing...
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Banned Stages</h3>
            <div className="space-y-2">
              {bannedStages.map((stage) => {
                const isStarter = STARTER_STAGES.includes(stage)
                const isCounterpick = COUNTERPICK_STAGES.includes(stage)
                
                return (
                  <div key={stage} className="p-2 bg-gray-100 border rounded text-gray-500">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{stage}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderGameActive = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-semibold mb-4">Game {currentGame}</h2>
      
      {/* Player Indicators */}
      {playerIndex !== null && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <div className={`flex items-center space-x-2 ${playerIndex === 0 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Player 1 {playerIndex === 0 ? '(You)' : '(Opponent)'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${playerIndex === 1 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
              <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Player 2 {playerIndex === 1 ? '(You)' : '(Opponent)'}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-lg">Stage: <span className="font-semibold">{selectedStage}</span></p>
        <p className="text-lg">Score: <span className="font-semibold">{player1Score} - {player2Score}</span></p>
      </div>

      {/* Game Result Validation Messages */}
      {gameResultPending && pendingResult && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-semibold">Waiting for Result Confirmation</p>
          <p className="text-yellow-700 text-sm">
            Player {pendingResult.reportedBy + 1} reported Player {pendingResult.winner + 1} won. 
            Waiting for other player to confirm the same result.
          </p>
        </div>
      )}

      {gameResultConflict && conflictResult && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">Result Conflict Detected</p>
          <p className="text-red-700 text-sm">
            Player 1 reported Player {conflictResult.player1Reported + 1} won.<br/>
            Player 2 reported Player {conflictResult.player2Reported + 1} won.<br/>
            Both players must report the same result. Please discuss and report again.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleGameResult(0)}
          disabled={isReportingResult}
          className={`p-3 rounded transition-all ${
            isReportingResult
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : playerIndex === 0 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {isReportingResult ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Reporting...</span>
            </div>
          ) : (
            <span>{playerIndex === 0 ? 'You Win' : 'Player 1 Wins'}</span>
          )}
        </button>
        <button
          onClick={() => handleGameResult(1)}
          disabled={isReportingResult}
          className={`p-3 rounded transition-all ${
            isReportingResult
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : playerIndex === 1 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {isReportingResult ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Reporting...</span>
            </div>
          ) : (
            <span>{playerIndex === 1 ? 'You Win' : 'Player 2 Wins'}</span>
          )}
        </button>
      </div>
    </div>
  )

  const renderMatchComplete = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-semibold mb-4">Match Complete!</h2>
      
      {/* Player Indicators */}
      {playerIndex !== null && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <div className={`flex items-center space-x-2 ${playerIndex === 0 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Player 1 {playerIndex === 0 ? '(You)' : '(Opponent)'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${playerIndex === 1 ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
              <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Player 2 {playerIndex === 1 ? '(You)' : '(Opponent)'}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center mb-6">
        <p className="text-2xl font-bold mb-2">Final Score</p>
        <p className="text-4xl font-bold text-blue-600">{player1Score} - {player2Score}</p>
      </div>
      
      <div className="text-center">
        <p className="text-lg mb-2">
          Winner: <span className="font-semibold text-green-600">
            {player1Score > player2Score ? 'Player 1' : 'Player 2'}
            {playerIndex !== null && (
              <span className="text-sm text-gray-600 ml-2">
                ({player1Score > player2Score ? (playerIndex === 0 ? 'You' : 'Opponent') : (playerIndex === 1 ? 'You' : 'Opponent')})
              </span>
            )}
          </span>
        </p>
        <p className="text-sm text-gray-600">
          Best of 3 - {Math.max(player1Score, player2Score)} games won
        </p>
      </div>
    </div>
  )

  const renderMatchEnded = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-semibold mb-4 text-center">Match Ended</h2>
      
      <div className="text-center mb-6">
        <p className="text-lg text-gray-600 mb-4">
          {opponentLeft ? 'Your opponent has left the match.' : 'The match has ended.'}
        </p>
        <p className="text-sm text-gray-500">
          You can review the chat history below or return to find a new match.
        </p>
      </div>
      
      <div className="text-center">
        <button
          onClick={onLeaveMatch}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Return to Free Battle
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-blue-600 text-white p-3 md:p-4 rounded-t-lg flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-2 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold">Tournament Match</h2>
            <p className="text-sm opacity-90">
              Opponent from {opponent.preferences.island} ({opponent.preferences.connection})
            </p>
            {playerIndex !== null && (
              <p className="text-sm opacity-90 mt-1">
                You are <span className="font-semibold">Player {playerIndex + 1}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => {
                if (!opponentLeft && matchStatusState !== 'completed') setShowChat(!showChat)
              }}
              className={`px-2 py-1 md:px-3 md:py-1 bg-blue-500 text-white rounded text-xs md:text-sm hover:bg-blue-600 ${opponentLeft || matchStatusState === 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={opponentLeft || matchStatusState === 'completed'}
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </button>
            <button
              onClick={onLeaveMatch}
              className="px-2 py-1 md:px-3 md:py-1 bg-red-500 text-white rounded text-xs md:text-sm hover:bg-red-600"
            >
              Leave Match
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Content */}
          <div className="flex-1 order-2 lg:order-1">
            {matchStatusState === 'character_selection' && renderCharacterSelection()}
            {matchStatusState === 'stage_striking' && renderStageStriking()}
            {matchStatusState === 'active' && renderGameActive()}
            {matchStatusState === 'completed' && renderMatchComplete()}
            {matchEnded && renderMatchEnded()}
          </div>

          {/* Chat Sidebar */}
          {showChat && (
            <div className="w-full lg:w-80 order-1 lg:order-2">
              <MatchChat
                matchId={matchId}
                opponent={opponent}
                onLeaveMatch={onLeaveMatch}
                opponentLeft={opponentLeft}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 