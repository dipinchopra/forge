export const formulas={
 'hpsc':{name:'Hook → Problem → Solution → CTA',steps:['HOOK','PROBLEM','SOLUTION','SOLUTION','PROOF','CTA']},
 'aida':{name:'AIDA · Attention → Interest → Desire → Action',steps:['ATTENTION','INTEREST','INTEREST','DESIRE','PROOF','ACTION']},
 'pas':{name:'PAS · Problem → Agitate → Solve',steps:['HOOK','PROBLEM','AGITATE','SOLUTION','PROOF','CTA']},
 'hero':{name:'Hero · Goal → Obstacle → Guide → Result',steps:['GOAL','OBSTACLE','GUIDE','ACTION','RESULT','CTA']},
} as const;
export type Formula=keyof typeof formulas;
export const ratios={'9:16':1920,'4:5':1350,'1:1':1080} as const;
