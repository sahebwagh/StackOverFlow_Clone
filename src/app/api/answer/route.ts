import { answerCollection, db } from "@/models/name";
import { databases, users } from "@/models/server/config";
import { UserPrefs } from "@/store/Auth";
import { NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    const { questionId, answer, authorId } = await request.json();

    const response = await databases.createDocument(
      db,
      answerCollection,
      ID.unique(),
      {
        content: answer,
        authorId: authorId,
        questionId: questionId,
      }
    );

    // increase author reputation
    const prefs = await users.getPrefs<UserPrefs>(authorId);
    await users.updatePrefs(authorId, {
      reputation: Number(prefs.reputation) + 1,
    });

    return NextResponse.json(response, {
      status: 201,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Error crating answer",
      },
      {
        status: error?.status || error?.code || 500,
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { answerId } = await request.json();

    const answer = await databases.getDocument(db, answerCollection, answerId);

    if (!answer) {
      return NextResponse.json(
        {
          message: "Document not found",
        },
        {
          status: 400,
        }
      );
    }

    const response = await databases.deleteDocument(
      db,
      answerCollection,
      answerId
    );

    // decrease the reputation
    const prefs = await users.getPrefs<UserPrefs>(answer.authorId);

    await users.updatePrefs(answer.authorId, {
      reputation: Number(prefs.reputation) - 1,
    });
    return NextResponse.json(
      {
        data: response,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Error deleting the answer",
      },
      {
        status: error?.state || error?.code || 500,
      }
    );
  }
}
