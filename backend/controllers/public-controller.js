import crypto from 'node:crypto'; import { prisma } from '../config/prisma.js'; import { publicCertificate } from '../services/certificate-service.js';
export async function verify(req,res){const ip=crypto.createHash('sha256').update(req.ip||'').digest('hex');res.json(await publicCertificate(prisma,req.params.certificateId.toUpperCase(),ip));}
export function health(_req,res){res.json({status:'healthy',service:'certiverify',timestamp:new Date().toISOString()});}
