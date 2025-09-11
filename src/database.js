import { createClient } from '@supabase/supabase-js';

export class SupabaseDatabase {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
    }

    async init() {
        try {
            // Проверяем подключение к Supabase
            const { data, error } = await this.supabase
                .from('birthdays')
                .select('count')
                .limit(1);

            if (error) {
                console.error('Supabase connection error:', error);
                throw error;
            }

            console.log('Connected to Supabase successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            throw error;
        }
    }

    // Методы для работы с пользователями
    async upsertUser(chatId, username = null, firstName = null, lastName = null, isBot = false, languageCode = null) {
        try {
            const { error } = await this.supabase.rpc('upsert_user', {
                p_chat_id: chatId,
                p_username: username,
                p_first_name: firstName,
                p_last_name: lastName,
                p_is_bot: isBot,
                p_language_code: languageCode
            });

            if (error) {
                console.error('Error upserting user:', error);
                return false;
            }

            console.log(`User upserted: ${username || firstName || chatId}`);
            return true;
        } catch (error) {
            console.error('Failed to upsert user:', error);
            return false;
        }
    }

    async getUser(chatId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('chat_id', chatId)
                .single();

            if (error) {
                console.error('Error getting user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('last_activity', { ascending: false });

            if (error) {
                console.error('Error getting all users:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Failed to get all users:', error);
            return [];
        }
    }

    async updateUserActivity(chatId) {
        try {
            const { error } = await this.supabase
                .from('users')
                .update({ last_activity: new Date().toISOString() })
                .eq('chat_id', chatId);

            if (error) {
                console.error('Error updating user activity:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to update user activity:', error);
            return false;
        }
    }

    async addBirthday(chatId, name, date, info = null) {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .insert([
                    {
                        chat_id: chatId,
                        name: name,
                        birth_date: date,
                        info: info
                    }
                ])
                .select();

            if (error) {
                console.error('Error adding birthday:', error);
                return null;
            }

            console.log(`Added birthday for ${name} (ID: ${data[0].id})`);
            return data[0].id;

        } catch (error) {
            console.error('Error adding birthday:', error);
            return null;
        }
    }

    async getBirthdaysByChatId(chatId) {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .select('*')
                .eq('chat_id', chatId)
                .order('name');

            if (error) {
                console.error('Error getting birthdays:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('Error getting birthdays:', error);
            return [];
        }
    }

    async getAllBirthdays() {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .select('*')
                .order('chat_id, name');

            if (error) {
                console.error('Error getting all birthdays:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('Error getting all birthdays:', error);
            return [];
        }
    }

    async getBirthdaysByDate(month, day) {
        try {
            // Supabase использует PostgreSQL, поэтому можем использовать SQL функции
            const { data, error } = await this.supabase
                .from('birthdays')
                .select('*')
                .eq('extract(month from birth_date)', month)
                .eq('extract(day from birth_date)', day);

            if (error) {
                console.error('Error getting birthdays by date:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('Error getting birthdays by date:', error);
            return [];
        }
    }

    async updateBirthday(id, name, date, info = null) {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .update({
                    name: name,
                    birth_date: date,
                    info: info,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error updating birthday:', error);
                return 0;
            }

            console.log(`Updated birthday ID: ${id}`);
            return data.length;

        } catch (error) {
            console.error('Error updating birthday:', error);
            return 0;
        }
    }

    async deleteBirthday(id) {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error deleting birthday:', error);
                return 0;
            }

            console.log(`Deleted birthday ID: ${id}`);
            return data.length;

        } catch (error) {
            console.error('Error deleting birthday:', error);
            return 0;
        }
    }

    async getBirthdayStats(chatId) {
        try {
            const { data, error } = await this.supabase
                .from('birthdays')
                .select('*')
                .eq('chat_id', chatId);

            if (error) {
                console.error('Error getting birthday stats:', error);
                return null;
            }

            const birthdays = data || [];
            
            if (birthdays.length === 0) {
                return {
                    total: 0,
                    thisMonth: 0,
                    nextMonth: 0,
                    upcoming: []
                };
            }

            const today = new Date();
            const thisMonth = today.getMonth() + 1;
            const nextMonth = today.getMonth() === 11 ? 1 : today.getMonth() + 2;

            let thisMonthCount = 0;
            let nextMonthCount = 0;
            const upcoming = [];

            for (const birthday of birthdays) {
                const birthDate = new Date(birthday.birth_date);
                const birthMonth = birthDate.getMonth() + 1;
                const birthDay = birthDate.getDate();
                
                if (birthMonth === thisMonth) {
                    thisMonthCount++;
                } else if (birthMonth === nextMonth) {
                    nextMonthCount++;
                }

                // Вычисляем дни до следующего дня рождения
                const nextBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
                if (nextBirthday < today) {
                    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
                }
                
                const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 30) {
                    upcoming.push({
                        name: birthday.name,
                        date: nextBirthday.toISOString().split('T')[0],
                        daysUntil
                    });
                }
            }

            return {
                total: birthdays.length,
                thisMonth: thisMonthCount,
                nextMonth: nextMonthCount,
                upcoming: upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
            };

        } catch (error) {
            console.error('Error getting birthday stats:', error);
            return null;
        }
    }
}