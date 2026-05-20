import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update mp_accept_invite
invite_code = """
    enc_text, correct_answer, cipher_type, cipher_hint, xp_reward = generate_mp_question(match_level, [])

    start_at = int(time.time() * 1000)
    match_ref = get_db().collection("mp_matches").document()
    mid = match_ref.id

    batch = get_db().batch()
    batch.set(
        match_ref,
        {
            "inviteId": invite_id,
            "uids": [from_uid, my_uid],
            "usernames": {
                from_uid: inv.get("fromUsername", "?"),
                my_uid: inv.get("toUsername", "?"),
            },
            "question": enc_text,
            "correctAnswer": correct_answer,
            "cipherType": cipher_type,
            "cipherHint": cipher_hint,
            "xpReward": xp_reward,
            "matchLevel": match_level,
            "matchFormat": match_format,
            "targetScore": target_score,
            "scores": {from_uid: 0, my_uid: 0},
            "currentRound": 1,
            "usedWords": [correct_answer],
"""
content = re.sub(
    r'enc_text, correct_answer, cipher_type, cipher_hint, xp_reward = generate_mp_question\(match_level\).*?"currentRound": 1,',
    invite_code.strip(),
    content,
    flags=re.DOTALL
)

# Update mp_submit_answer logic to handle usedWords
submit_code = """
        user_ans = raw.get("answer", "")
        # Case insensitive check
        correct = (user_ans.strip().upper() == correct_ans.strip().upper())

        answers[my_uid] = {
            "answer": user_ans,
            "correct": correct,
            "submittedAt": int(time.time() * 1000),
        }
        updates = {"answers": answers}
"""
content = re.sub(
    r'user_ans = raw\.get\("answer", ""\).*?updates = \{"answers": answers\}',
    submit_code.strip(),
    content,
    flags=re.DOTALL
)

submit_round_code = """
        if winner:
            scores[winner] = scores.get(winner, 0) + 1
            if scores[winner] >= match.get("targetScore", 1):
                updates["status"] = "done"
                updates["winnerUid"] = winner
                updates["loserUid"] = loser
                updates["resultReason"] = "score_limit"
                updates["scores"] = scores
                if winner:
                    _update_user_xp(winner, match.get("xpReward", 0))
            else:
                # Next round
                current_round = match.get("currentRound", 1)
                updates["currentRound"] = current_round + 1
                updates["lastRoundWinner"] = winner
                updates["lastRoundCorrectAnswer"] = match.get("correctAnswer")
                
                used_words = match.get("usedWords", [])
                
                # New question
                e_text, c_ans, c_type, c_hint, xp_r = generate_mp_question(match.get("matchLevel", 1), used_words)
                updates["question"] = e_text
                updates["correctAnswer"] = c_ans
                updates["cipherType"] = c_type
                updates["cipherHint"] = c_hint
                updates["answers"] = {}
                updates["scores"] = scores
                updates["startAt"] = int(time.time() * 1000)
                
                used_words.append(c_ans)
                updates["usedWords"] = used_words
"""
content = re.sub(
    r'if winner:.*?updates\["scores"\] = scores\s*updates\["startAt"\] = int\(time\.time\(\) \* 1000\)',
    submit_round_code.strip(),
    content,
    flags=re.DOTALL
)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
