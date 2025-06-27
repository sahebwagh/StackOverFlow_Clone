import { answerCollection, db, questionCollection, voteCollection } from "@/models/name";
import { databases, users } from "@/models/server/config";
import { UserPrefs } from "@/store/Auth";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";

export async function POST(request: NextRequest){
    try {
        // grap the data
        const {votedById, voteStatus, type, typeId} = await request.json()
        // list-document
        const response = await databases.listDocuments(
            db, voteCollection, [
                Query.equal("type", type),
                Query.equal("typeId", typeId),
                Query.equal("votedById", votedById),
            ]
        )

        if(response.documents.length > 0){
            await databases.deleteDocument(db, voteCollection, response.documents[0].$id)

            // decrese the reputation of the quaetion/answer author
            const QuestionOrAnswer = await databases.getDocument(
                db,
                type === "question" ? questionCollection : answerCollection,
                typeId
            )

            const authorPrefs = await users.getPrefs<UserPrefs>(QuestionOrAnswer.authorId)

            await users.updatePrefs<UserPrefs>(QuestionOrAnswer.authorId, {
              reputation:
                response.documents[0].voteStatus === "upvoted"
                  ? Number(authorPrefs.reputation) - 1
                  : Number(authorPrefs.reputation) + 1,
            });
        }
        
        // that means prev vote does not exists or vote status changes
        if(response.documents[0]?.voteStatus !== voteStatus){
            const doc = await databases.createDocument(db, voteCollection, ID.unique(), {
                type,
                typeId,
                voteStatus,
                votedById,
            });

            // Increase or decrease the reputation 
            const QuestionOrAnswer = await databases.getDocument(
              db,
              type === "question" ? questionCollection : answerCollection,
              typeId
            );

            const authorPrefs = await users.getPrefs<UserPrefs>(
              QuestionOrAnswer.authorId
            );
            // if the vote was present 
            if(response.documents[0]){
                await users.updatePrefs<UserPrefs>(QuestionOrAnswer.authorId, {
                    reputation: // that means prev vote was "upvoted" so we have to decreatse the reputation
                    response.documents[0].voteStatus === "upvote"
                    ? Number(authorPrefs.reputation) - 1
                    : Number(authorPrefs.reputation) + 1,
                })
            } else{
                await users.updatePrefs<UserPrefs>(QuestionOrAnswer.authorId, {
                  // that means prev vote was "upvoted" and  new value is "downvoted " so we have to decrease the reputation
                  reputation:
                    voteStatus === "upvoted"
                      ? Number(authorPrefs.reputation) + 1
                      : Number(authorPrefs.reputation) - 1,
                });
            }
        }



        // calculating the total upvotes and downvotes 
        const [upvotes, downvotes] = await Promise.all([
            databases.listDocuments(db, voteCollection, [
                Query.equal("type", type),
                Query.equal("typeId", typeId),
                Query.equal("voteStatus", "upvoted"),
                Query.equal("votedById", votedById),
                Query.limit(1),
            ]),
            databases.listDocuments(db, voteCollection, [
                Query.equal("type", type),
                Query.equal("typeId", typeId),
                Query.equal("voteStatus", "downvoted"),
                Query.equal("votedById", votedById),
                Query.limit(1),
            ]),
        ])

        return NextResponse.json({
            data: {
                document: null, voteResult: upvotes.total - downvotes.total
            },
            message: "vote handled"
        })

    } catch (error: any) {
        return NextResponse.json(
          {
            error: error?.message || "Error in voting",
          },
          {
            status: error?.status || error?.code || 500,
          }
        );
    }
}