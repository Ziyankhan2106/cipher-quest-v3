import re

# 1. Update app.py cl_complete_mission
with open('app.py', 'r', encoding='utf-8') as f:
    app_py = f.read()

cl_update_code = """
    if not isinstance(points, int) or points < 0 or not isinstance(mission_id, str):
        return jsonify({"error": "Invalid data."}), 400

    used_word = data.get("usedWord")

    uid = request.session_user["uid"]
    
    # 1. Update CipherLab profile (completed levels)
    cl_ref = get_db().collection("cl_profiles").document(uid)
    cl_doc = cl_ref.get()
    if not cl_doc.exists:
        return jsonify({"error": "Profile not found."}), 404

    profile = cl_doc.to_dict()
    completed = list(profile.get("completedLevelIds") or [])
    used_words = list(profile.get("usedWords") or [])
    
    if mission_id not in completed:
        completed.append(mission_id)
    if used_word and used_word not in used_words:
        used_words.append(used_word)

    cl_ref.update({
        "completedLevelIds": completed,
        "usedWords": used_words,
        "lastActive": firestore.SERVER_TIMESTAMP
    })
"""

app_py = re.sub(
    r'if not isinstance\(points, int\) or points < 0 or not isinstance\(mission_id, str\):.*?cl_ref\.update\(\{\n\s*"completedLevelIds": completed,',
    cl_update_code.strip() + '\n\n    cl_ref.update({\n        "completedLevelIds": completed,',
    app_py,
    flags=re.DOTALL
)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(app_py)

# 2. Update CipherLab.tsx
with open('cipherlab/CipherLab.tsx', 'r', encoding='utf-8') as f:
    tsx = f.read()

# Add usedWords to UserData
tsx = re.sub(
    r'completedLevelIds: string\[\];\s*\}',
    'completedLevelIds: string[];\n  usedWords?: string[];\n}',
    tsx
)

# Update cl_get_profile response handling (just relies on UserData interface, but make sure usedWords is loaded)
# Already handled by type update

# Update startNewMission
new_mission_code = """
  const startNewMission = useCallback(() => {
    const level = user.completedLevelIds.length < 5 ? 1 : user.completedLevelIds.length < 12 ? 2 : 3;
    const mission = generateMission(level, user.usedWords || []);
    setSessionMission(mission);
"""
tsx = re.sub(
    r'const startNewMission = useCallback\(\(\) => \{.*?setSessionMission\(mission\);',
    new_mission_code.strip(),
    tsx,
    flags=re.DOTALL
)

# Update submit answer
# Find cl_complete_mission call and add usedWord
submit_code = """
          body: JSON.stringify({
            points: earnedPoints,
            missionId: sessionMission.id,
            usedWord: sessionMission.originalText
          })
"""
tsx = re.sub(
    r'body: JSON\.stringify\(\{\s*points: earnedPoints,\s*missionId: sessionMission\.id\s*\}\)',
    submit_code.strip(),
    tsx
)

# Case insensitivity check in CipherLab.tsx (already there?)
# Let's verify what it uses: userInput.trim() === sessionMission.expectedCiphertext
# We should change it to uppercase check
check_code = """
    if (userInput.trim().toUpperCase() === sessionMission.expectedCiphertext.toUpperCase()) {
"""
tsx = re.sub(
    r'if \(userInput\.trim\(\) === sessionMission\.expectedCiphertext\)',
    check_code.strip(),
    tsx
)

with open('cipherlab/CipherLab.tsx', 'w', encoding='utf-8') as f:
    f.write(tsx)

