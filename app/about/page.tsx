export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">
            About HawaiiSSBU
          </h1>
          <p className="text-xl text-hawaii-muted">
            Connecting Hawaii's Super Smash Bros. Ultimate community
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
          <div className="space-y-8">
            {/* Mission Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">
                Our Mission
              </h2>
              <p className="text-hawaii-muted leading-relaxed">
                Welcome to HawaiiSSBU — the home for Smash Ultimate matchmaking in the islands.
                Join ranked and casual matches with local players, climb the leaderboard, and connect with the Hawai'i Smash community — all in real time. Whether you're training for your next tournament or just down for friendlies, HawaiiSSBU makes it easy to find your next set.
              </p>
            </section>

            {/* Features Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">
                What We Offer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
                  <h3 className="text-lg font-semibold mb-2 text-hawaii-primary font-monopol">Free Battle</h3>
                  <p className="text-hawaii-muted text-sm">
                    Find casual matches with players of any skill level. Perfect for practice, 
                    learning new characters, or just having fun.
                  </p>
                </div>
                <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
                  <h3 className="text-lg font-semibold mb-2 text-hawaii-secondary font-monopol">Rating Battle</h3>
                  <p className="text-hawaii-muted text-sm">
                    Compete in ranked matches and climb the leaderboard. Track your progress 
                    and challenge yourself against similarly skilled opponents.
                  </p>
                </div>
                <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
                  <h3 className="text-lg font-semibold mb-2 text-hawaii-primary font-monopol">Tournaments</h3>
                  <p className="text-hawaii-muted text-sm">
                    Discover local tournaments and events across Hawaii. Stay updated on 
                    upcoming competitions and registration deadlines.
                  </p>
                </div>
                <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
                  <h3 className="text-lg font-semibold mb-2 text-hawaii-secondary font-monopol">Rankings</h3>
                  <p className="text-hawaii-muted text-sm">
                    View the current power rankings for Hawaii's top players. See who's 
                    dominating the scene and track your own ranking progress.
                  </p>
                </div>
              </div>
            </section>

            {/* Community Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">
                Join Our Community
              </h2>
              <p className="text-hawaii-muted leading-relaxed mb-4">
                Whether you're a seasoned competitor or just starting your Smash journey, 
                HawaiiSSBU welcomes players of all backgrounds and skill levels. Our platform 
                is designed to help you:
              </p>
              <ul className="list-disc list-inside space-y-2 text-hawaii-muted mb-6">
                <li>Connect with local players and make new friends</li>
                <li>Improve your skills through regular practice and competition</li>
                <li>Stay informed about tournaments and events in your area</li>
                <li>Track your progress and see how you rank against other players</li>
                <li>Participate in a supportive and inclusive gaming community</li>
              </ul>
            </section>

            {/* Social Media Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">
                Connect With Us
              </h2>
              <p className="text-hawaii-muted leading-relaxed mb-6">
                Stay connected with the Hawaii Smash community through our social media channels:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href="https://discord.gg/EEANKBG3" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border hover:border-hawaii-primary transition-colors group"
                >
                  <div className="text-center">
                    <h3 className="font-semibold text-hawaii-primary group-hover:text-hawaii-accent transition-colors font-monopol">Discord</h3>
                    <p className="text-hawaii-muted text-sm">Join our Discord server for real-time chat, tournament updates, and matchmaking</p>
                  </div>
                </a>
                <a 
                  href="https://www.instagram.com/808ultimate/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border hover:border-hawaii-primary transition-colors group"
                >
                  <div className="text-center">
                    <h3 className="font-semibold text-hawaii-primary group-hover:text-hawaii-accent transition-colors font-monopol">Instagram</h3>
                    <p className="text-hawaii-muted text-sm">Follow @808ultimate for tournament photos, highlights, and community updates</p>
                  </div>
                </a>
                <a 
                  href="https://www.facebook.com/groups/672648416185974/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border hover:border-hawaii-primary transition-colors group"
                >
                  <div className="text-center">
                    <h3 className="font-semibold text-hawaii-primary group-hover:text-hawaii-accent transition-colors font-monopol">Facebook</h3>
                    <p className="text-hawaii-muted text-sm">Join our Facebook group for event announcements, discussions, and community news</p>
                  </div>
                </a>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-hawaii-border pt-6 mt-8">
              <p className="text-center text-hawaii-muted text-sm">
                Built with ❤️ for the Hawaii Smash community
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 