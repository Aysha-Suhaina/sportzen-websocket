import { Router} from "express";
import { matchesTable } from "../db/schema.js";
import { db } from "../db/db.js";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter= Router();

matchRouter.get('/', async (req,res)=>{

    const MAX_LIMIT = 100;
    //res.status(200).json({message:"Get all matches - To be implemented"});
    const parsed =listMatchesQuerySchema.safeParse(req.query);

    if(!parsed.success){
        return res.status(400).json({error:'invalid query',details:JSON.stringify(parsed.error)});
    }
    const limit = Math.min(parsed.data.limit ?? 50,MAX_LIMIT) ;

    try{

        const data = await db.select().from(matchesTable).
        orderBy(desc(matchesTable.createdAt )).limit(limit)

        res.json({data})

    }catch(e){
        res.status(500).json({error:'failed to list all matches',details: e.message});
    }
})

matchRouter.post('/', async (req,res)=>{
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        const errors = parsed.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        console.error('Validation failed for request body:', req.body);
        console.error('Validation errors:', errors);
        return res.status(400).json({ error: 'invalid payload', details: errors });
    }
    const {startTime , endTime , homeScore , awayScore, sport}=parsed.data;
    try{

        const [event] = await db.insert (matchesTable).values({
            sports: sport,
            homeTeam: parsed.data.homeTeam,
            awayTeam: parsed.data.awayTeam,
            startTime:new Date(startTime),
            endTime : new Date(endTime),
            homeScore : homeScore ?? 0,
            awayScore : awayScore ?? 0,
            status: getMatchStatus(startTime,endTime),
        }).returning();

        res.status(201).json({data: event })
    }
    catch(error){
        res.status(500).json({error:"Failed to create match", details: error.message});
    }

})