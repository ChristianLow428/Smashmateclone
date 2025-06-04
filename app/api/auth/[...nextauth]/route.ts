import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import DiscordProvider from 'next-auth/providers/discord'
// import TwitterProvider from 'next-auth/providers/twitter'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    //TwitterProvider({
      // clientId: process.env.TWITTER_CLIENT_ID!,
      // clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      // version: '2.0', // Twitter API v2
    //}),
  ],
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST } 