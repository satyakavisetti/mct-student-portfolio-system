const { query } = require('../config/database');

let goalTopicProgressAvailable = null;

const checkGoalTopicProgressColumn = async () => {
  if (goalTopicProgressAvailable !== null) {
    return goalTopicProgressAvailable;
  }

  try {
    const result = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='goal_topics' AND column_name='progress_percentage' LIMIT 1"
    );
    goalTopicProgressAvailable = result.rows.length > 0;
  } catch (error) {
    goalTopicProgressAvailable = false;
  }

  return goalTopicProgressAvailable;
};

const ensureGoalAccess = async (req, goalId, studentId) => {
  if (req.user.role === 'coordinator') {
    return true;
  }
  const ownerId = studentId ?? (await query('SELECT student_id FROM goals WHERE id = $1', [goalId])).rows[0]?.student_id;
  return ownerId === req.user.id;
};

const loadGoalTopics = async (goalId) => {
  const hasProgress = await checkGoalTopicProgressColumn();
  const queryText = hasProgress
    ? 'SELECT id, topic_name, COALESCE(progress_percentage,0) AS progress_percentage FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC'
    : 'SELECT id, topic_name FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC';

  const topicsResult = await query(queryText, [goalId]);
  return topicsResult.rows.map((t) => ({
    id: t.id,
    topic_name: t.topic_name,
    progress_percentage: hasProgress ? Number(t.progress_percentage || 0) : 0,
  }));
};

const getGoals = async (req, res) => {
  try {
    const requestedStudentId = req.query.studentId ? Number(req.query.studentId) : req.user.id;
    if (req.user.role !== 'coordinator' && requestedStudentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these goals.' });
    }

    const result = await query(
      'SELECT id, student_id, title, goal_type, custom_goal_type, description, target_date, status, created_at, updated_at FROM goals WHERE student_id = $1 ORDER BY created_at DESC',
      [requestedStudentId]
    );

    const goalsWithTopics = [];
    for (const goal of result.rows) {
      const topics = await loadGoalTopics(goal.id);

      // compute progress stats for this goal
      const totalTopics = topics.length;
      const completedTopics = topics.filter((t) => Number(t.progress_percentage) === 100).length;
      const pendingTopics = topics.filter((t) => Number(t.progress_percentage) < 100).length;
      const average = totalTopics > 0 ? Math.round(topics.reduce((s, it) => s + (Number(it.progress_percentage) || 0), 0) / totalTopics) : 0;

      goalsWithTopics.push({
        ...goal,
        topics,
        progressStats: {
          average,
          totalTopics,
          completedTopics,
          pendingTopics,
        },
      });
    }

    return res.status(200).json({ success: true, data: goalsWithTopics });
  } catch (error) {
    console.error('getGoals error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching goals.' });
  }
};

const addGoal = async (req, res) => {
  try {
    const { title, goal_type, custom_goal_type, description, target_date, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Goal title is required.' });
    }
    if (goal_type === 'Other' && (!custom_goal_type || !custom_goal_type.trim())) {
      return res.status(400).json({ success: false, message: 'Custom goal type is required when selecting Other.' });
    }

    const result = await query(
      `INSERT INTO goals (student_id, title, goal_type, custom_goal_type, description, target_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, title.trim(), goal_type || null, goal_type === 'Other' ? custom_goal_type.trim() : null, description || null, target_date || null, status || 'pending']
    );
    return res.status(201).json({ success: true, message: 'Goal added.', data: result.rows[0] });
  } catch (error) {
    console.error('addGoal error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding goal.' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT student_id FROM goals WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, id, existing.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this goal.' });
    }

    const { title, goal_type, custom_goal_type, description, target_date, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Goal title is required.' });
    }
    if (goal_type === 'Other' && (!custom_goal_type || !custom_goal_type.trim())) {
      return res.status(400).json({ success: false, message: 'Custom goal type is required when selecting Other.' });
    }

    const result = await query(
      `UPDATE goals SET title=$1, goal_type=$2, custom_goal_type=$3, description=$4, target_date=$5, status=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [title.trim(), goal_type || null, goal_type === 'Other' ? custom_goal_type.trim() : null, description || null, target_date || null, status || 'pending', id]
    );
    return res.status(200).json({ success: true, message: 'Goal updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateGoal error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating goal.' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT student_id FROM goals WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, id, existing.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this goal.' });
    }

    await query('DELETE FROM goals WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Goal deleted.' });
  } catch (error) {
    console.error('deleteGoal error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting goal.' });
  }
};

const getGoalTopics = async (req, res) => {
  try {
    const { goalId } = req.params;
    const existing = await query('SELECT student_id FROM goals WHERE id = $1', [goalId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, goalId, existing.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these topics.' });
    }

    const hasProgress = await checkGoalTopicProgressColumn();
    const queryText = hasProgress
      ? 'SELECT id, topic_name, COALESCE(progress_percentage,0) AS progress_percentage FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC'
      : 'SELECT id, topic_name FROM goal_topics WHERE goal_id = $1 ORDER BY id ASC';

    const result = await query(queryText, [goalId]);
    const rows = result.rows.map((r) => ({
      id: r.id,
      topic_name: r.topic_name,
      progress_percentage: hasProgress ? Number(r.progress_percentage || 0) : 0,
    }));
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getGoalTopics error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching topics.' });
  }
};

const addGoalTopic = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { topic_name } = req.body;
    let { progress_percentage } = req.body;
    const hasProgress = await checkGoalTopicProgressColumn();

    progress_percentage = progress_percentage === undefined || progress_percentage === null || progress_percentage === '' ? 0 : Number(progress_percentage);
    if (Number.isNaN(progress_percentage) || progress_percentage < 0 || progress_percentage > 100) {
      return res.status(400).json({ success: false, message: 'progress_percentage must be between 0 and 100.' });
    }
    if (!topic_name || !topic_name.trim()) {
      return res.status(400).json({ success: false, message: 'Topic name is required.' });
    }

    const existingGoal = await query('SELECT student_id FROM goals WHERE id = $1', [goalId]);
    if (existingGoal.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, goalId, existingGoal.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to add topics to this goal.' });
    }

    const duplicate = await query(
      'SELECT id FROM goal_topics WHERE goal_id = $1 AND LOWER(topic_name) = LOWER($2)',
      [goalId, topic_name.trim()]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Topic already exists for this goal.' });
    }

    const insertText = hasProgress
      ? `INSERT INTO goal_topics (goal_id, topic_name, progress_percentage, created_at, updated_at)
         VALUES ($1,$2,$3,NOW(),NOW()) RETURNING *`
      : `INSERT INTO goal_topics (goal_id, topic_name, created_at, updated_at)
         VALUES ($1,$2,NOW(),NOW()) RETURNING *`;
    const params = hasProgress ? [goalId, topic_name.trim(), progress_percentage] : [goalId, topic_name.trim()];

    const result = await query(insertText, params);
    const insertedRow = result.rows[0];
    if (!hasProgress && insertedRow) {
      insertedRow.progress_percentage = 0;
    }

    return res.status(201).json({ success: true, message: 'Topic added.', data: insertedRow });
  } catch (error) {
    console.error('addGoalTopic error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding topic.' });
  }
};

const updateGoalTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const existingTopic = await query('SELECT goal_id FROM goal_topics WHERE id = $1', [topicId]);
    if (existingTopic.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    const goal = await query('SELECT student_id FROM goals WHERE id = $1', [existingTopic.rows[0].goal_id]);
    if (goal.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, existingTopic.rows[0].goal_id, goal.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this topic.' });
    }

    const isProgressOnly = req.originalUrl && req.originalUrl.toLowerCase().includes('/progress');

    // If this is a progress-only update, only students may update progress.
    if (isProgressOnly && req.user.role === 'coordinator') {
      return res.status(403).json({ success: false, message: 'Coordinators cannot update progress.' });
    }

    let { topic_name } = req.body;
    let { progress_percentage } = req.body;
    const hasProgress = await checkGoalTopicProgressColumn();

    progress_percentage = progress_percentage === undefined || progress_percentage === null || progress_percentage === '' ? null : Number(progress_percentage);
    if (progress_percentage != null && (Number.isNaN(progress_percentage) || progress_percentage < 0 || progress_percentage > 100)) {
      return res.status(400).json({ success: false, message: 'progress_percentage must be between 0 and 100.' });
    }

    if (progress_percentage != null && !hasProgress) {
      return res.status(400).json({ success: false, message: 'Goal topic progress is not supported on this database schema.' });
    }

    // If not progress-only, topic_name is required (existing behavior preserved)
    if (!isProgressOnly) {
      if (!topic_name || !topic_name.trim()) {
        return res.status(400).json({ success: false, message: 'Topic name is required.' });
      }

      const duplicate = await query(
        'SELECT id FROM goal_topics WHERE goal_id = $1 AND id <> $2 AND LOWER(topic_name) = LOWER($3)',
        [existingTopic.rows[0].goal_id, topicId, topic_name.trim()]
      );
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Topic already exists for this goal.' });
      }
      topic_name = topic_name.trim();
    }

    // Build update parts
    const updates = [];
    const params = [];
    let idx = 1;
    if (topic_name != null) {
      updates.push(`topic_name=$${idx++}`);
      params.push(topic_name);
    }
    if (progress_percentage != null) {
      updates.push(`progress_percentage=$${idx++}`);
      params.push(progress_percentage);
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }
    updates.push('updated_at=NOW()');
    const sql = `UPDATE goal_topics SET ${updates.join(', ')} WHERE id=$${idx} RETURNING *`;
    params.push(topicId);

    const result = await query(sql, params);
    return res.status(200).json({ success: true, message: 'Topic updated.', data: result.rows[0] });
  } catch (error) {
    console.error('updateGoalTopic error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating topic.' });
  }
};

const deleteGoalTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const existingTopic = await query('SELECT goal_id FROM goal_topics WHERE id = $1', [topicId]);
    if (existingTopic.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    const goal = await query('SELECT student_id FROM goals WHERE id = $1', [existingTopic.rows[0].goal_id]);
    if (goal.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }
    if (!(await ensureGoalAccess(req, existingTopic.rows[0].goal_id, goal.rows[0].student_id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this topic.' });
    }

    await query('DELETE FROM goal_topics WHERE id = $1', [topicId]);
    return res.status(200).json({ success: true, message: 'Topic deleted.' });
  } catch (error) {
    console.error('deleteGoalTopic error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting topic.' });
  }
};

module.exports = {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  getGoalTopics,
  addGoalTopic,
  updateGoalTopic,
  deleteGoalTopic,
};
