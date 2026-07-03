const { fetchLeetCodeProfile } = require('./src/services/leetcodeService'
const { query } = require('./src/config/database');  
(async () = 
  try {  
    const profile = await fetchLeetCodeProfile('SatyaKavisetti');  
    console.log(JSON.stringify({  
      merged: {  
        currentStreak: profile.currentStreak,  
        maxStreak: profile.maxStreak,  
        activeDays: profile.activeDays,  
        topicStatistics: profile.topicStatistics  
      },  
      dataProfile: profile.profile ? {  
        currentStreak: profile.profile.currentStreak,  
        maxStreak: profile.profile.maxStreak,  
        activeDays: profile.profile.activeDays  
      } : null,  
      _graphql: profile._graphql ? {  
        currentStreak: profile._graphql.profile?.currentStreak,  
        maxStreak: profile._graphql.profile?.maxStreak,  
        activeDays: profile._graphql.profile?.activeDays,  
        totalActiveDays: profile._graphql.profile?.totalActiveDays,  
        topicStatistics: profile._graphql.topicStatistics  
      } : null,  
      _playwright: profile._playwright ? {  
        currentStreak: profile._playwright.currentStreak,  
        maxStreak: profile._playwright.maxStreak,  
        activeDays: profile._playwright.activeDays,  
        topicStatistics: profile._playwright.topicStatistics  
      } : null  
    }, null, 2));  
    const res = await query('SELECT student_id, platform, username, total_active_days, active_days, current_streak, max_streak, topic_statistics FROM coding_profiles WHERE student_id =  AND platform = ', [1, 'leetcode']);  
    console.log(JSON.stringify(res.rows, null, 2));  
  } catch (err) {  
    console.error(err);  
    process.exit(1);  
  }  
})();  
