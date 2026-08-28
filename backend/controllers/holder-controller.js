import { prisma } from '../config/prisma.js'; import { notFound } from '../utils/errors.js';
const where = (userId) => ({ recipient: { userId } });
export async function list(req,res){const certificates=await prisma.certificate.findMany({where:where(req.auth.userId),include:{organization:true,course:true,recipient:true},orderBy:{issueDate:'desc'}});res.json({items:certificates});}
export async function detail(req,res){const certificate=await prisma.certificate.findFirst({where:{id:req.params.id,...where(req.auth.userId)},include:{organization:true,course:true,recipient:true,prior:true,renewals:true}});if(!certificate)throw notFound('Certificate not found.');res.json(certificate);}
