"use strict";
// ELO rating calculation functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateExpectedWinRate = calculateExpectedWinRate;
exports.calculateELOChange = calculateELOChange;
exports.calculateAdjustedKFactor = calculateAdjustedKFactor;
exports.calculateNewRating = calculateNewRating;
exports.calculateRatingConfidence = calculateRatingConfidence;
exports.calculateProvisionalRating = calculateProvisionalRating;
exports.getRatingTier = getRatingTier;
exports.getRatingColor = getRatingColor;
function calculateExpectedWinRate(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}
function calculateELOChange(playerRating, opponentRating, result, playerGamesPlayed = 0, kFactor = 32) {
    const expectedWinRate = calculateExpectedWinRate(playerRating, opponentRating);
    const actualResult = result === 'win' ? 1 : 0;
    const ratingChange = Math.round(kFactor * (actualResult - expectedWinRate));
    return ratingChange;
}
function calculateAdjustedKFactor(playerRating, opponentRating, playerGamesPlayed, baseKFactor = 32) {
    let kFactor = baseKFactor;
    // Adjust K-factor based on player experience
    if (playerGamesPlayed < 10) {
        kFactor *= 1.5; // Higher K-factor for new players
    }
    else if (playerGamesPlayed > 50) {
        kFactor *= 0.8; // Lower K-factor for experienced players
    }
    // Adjust K-factor based on rating difference
    const ratingDifference = Math.abs(playerRating - opponentRating);
    if (ratingDifference > 200) {
        kFactor *= 0.9; // Lower K-factor for mismatched opponents
    }
    return Math.round(kFactor);
}
function calculateNewRating(currentRating, ratingChange) {
    return Math.max(100, currentRating + ratingChange);
}
function calculateRatingConfidence(playerRating, gamesPlayed) {
    if (gamesPlayed < 10)
        return 0.5; // Low confidence for new players
    if (gamesPlayed < 30)
        return 0.7; // Medium confidence
    return 0.9; // High confidence for experienced players
}
function calculateProvisionalRating(playerRating, gamesPlayed) {
    return gamesPlayed < 10;
}
function getRatingTier(rating) {
    if (rating >= 2000)
        return 'Master';
    if (rating >= 1800)
        return 'Expert';
    if (rating >= 1600)
        return 'Advanced';
    if (rating >= 1400)
        return 'Intermediate';
    if (rating >= 1200)
        return 'Beginner';
    return 'Novice';
}
function getRatingColor(rating) {
    if (rating >= 2000)
        return '#FFD700'; // Gold
    if (rating >= 1800)
        return '#C0C0C0'; // Silver
    if (rating >= 1600)
        return '#CD7F32'; // Bronze
    if (rating >= 1400)
        return '#4CAF50'; // Green
    if (rating >= 1200)
        return '#2196F3'; // Blue
    return '#9E9E9E'; // Gray
}
