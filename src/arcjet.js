import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';
export const arcjetEnabled = Boolean(arcjetKey);

if(!arcjetKey){
    console.warn('ARCJET_KEY is not set in environment variables. Arcjet integration will be disabled.');
}
else {
    console.log(`Arcjet protection enabled (${arcjetMode})`);
}

export const httpArcjet= arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules:[
            shield({mode:arcjetMode}),
            //detectBot({mode:arcjetMode, allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW','CURL']}),
            slidingWindow({mode:arcjetMode , interval :'10s',max:20})
        ]
    }) 
    : null;


export const wsArcjet= arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules:[
            shield({mode:arcjetMode}),
            detectBot({mode:arcjetMode, allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW']}),
            slidingWindow({mode:arcjetMode , interval :'2s',max:5})
        ]
    }) 
    : null;

export function securityMiddleware(){
    return async (req, res , next)=>{
        // Temporarily disable Arcjet for testing
        if (!httpArcjet || process.env.DISABLE_ARCJET === 'true') {
            return next();
        }

        try{
            const decision = await httpArcjet.protect(req, {
                requested: 1
            });
            const isRateLimited = decision.reason?.isRateLimit?.() ?? false;

            if(decision.isDenied()){
                console.log(`Arcjet denied ${req.method} ${req.url} - ${isRateLimited ? 'rate limit' : 'forbidden'}`);
                console.log(`Arcjet decision details:`, {
                    reason: decision.reason,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url,
                    method: req.method
                });

                if(isRateLimited){
                    return res.status(429).json({error:'too many requests'});
                }
                return res.status(403).json({error:'forbidden'});
            }
        }catch(e){
            console.error('arcjet middleware error', e);
            return res.status(503).json({error:'service unavailable'});
        }

        next();
    }
}