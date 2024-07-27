use std::path::{Path, PathBuf};

use actix_web::web::Bytes;
use log::error;

use crate::errors::AppError;
use crate::models::user::{Dispatcher, Session, User};
use crate::utils::{generate_session_token, hash_password, verify_password};

use super::dto::auth::LoginResponseDto;

// 追加部分の修正
use image::{GenericImageView, ImageError, imageops::FilterType, ImageOutputFormat};
use std::io::{self, Cursor, Write}; // Writeトレイトをスコープに追加
use std::os::unix::process::ExitStatusExt; // ExitStatusExtトレイトをインポート

// 重複していた定義を削除
/*
#[derive(Debug)]
enum AppError {
    InternalServerError,
}
*/

impl From<ImageError> for AppError {
    fn from(_: ImageError) -> Self {
        AppError::InternalServerError
    }
}

impl From<io::Error> for AppError {
    fn from(_: io::Error) -> Self {
        AppError::InternalServerError
    }
}

struct ImageOutput {
    status: std::process::ExitStatus, // ExitStatusの完全修飾名を使用
    stdout: Vec<u8>,
    stderr: Vec<u8>,
}

fn resize_image(input_path: &Path) -> Result<ImageOutput, AppError> {
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut status = std::process::ExitStatus::from_raw(0); // 成功ステータス

    match image::open(input_path) {
        Ok(img) => {
            // リサイズする
            let resized_img = img.resize(500, 500, FilterType::Nearest);

            // 画像をバイトストリームに変換
            let mut cursor = Cursor::new(Vec::new());
            match resized_img.write_to(&mut cursor, ImageOutputFormat::Png) {
                Ok(_) => {
                    stdout = cursor.into_inner();
                    let _ = writeln!(stdout, "リサイズされた画像が正常に保存されました");
                }
                Err(e) => {
                    status = std::process::ExitStatus::from_raw(1); // 失敗ステータス
                    let _ = writeln!(stderr, "画像の保存に失敗しました: {:?}", e);
                }
            }
        }
        Err(e) => {
            status = std::process::ExitStatus::from_raw(1); // 失敗ステータス
            let _ = writeln!(stderr, "画像の読み込みに失敗しました: {:?}", e);
        }
    }

    Ok(ImageOutput { status, stdout, stderr })
}

pub trait AuthRepository {
    async fn create_user(&self, username: &str, password: &str, role: &str)
        -> Result<(), AppError>;
    async fn find_user_by_id(&self, id: i32) -> Result<Option<User>, AppError>;
    async fn find_user_by_username(&self, username: &str) -> Result<Option<User>, AppError>;
    async fn create_dispatcher(&self, user_id: i32, area_id: i32) -> Result<(), AppError>;
    async fn find_dispatcher_by_id(&self, id: i32) -> Result<Option<Dispatcher>, AppError>;
    async fn find_dispatcher_by_user_id(
        &self,
        user_id: i32,
    ) -> Result<Option<Dispatcher>, AppError>;
    async fn find_profile_image_name_by_user_id(
        &self,
        user_id: i32,
    ) -> Result<Option<String>, AppError>;
    async fn authenticate_user(&self, username: &str, password: &str) -> Result<User, AppError>;
    async fn create_session(&self, user_id: i32, session_token: &str) -> Result<(), AppError>;
    async fn delete_session(&self, session_token: &str) -> Result<(), AppError>;
    async fn find_session_by_session_token(&self, session_token: &str)
        -> Result<Session, AppError>;
}

#[derive(Debug)]
pub struct AuthService<T: AuthRepository + std::fmt::Debug> {
    repository: T,
}

impl<T: AuthRepository + std::fmt::Debug> AuthService<T> {
    pub fn new(repository: T) -> Self {
        AuthService { repository }
    }

    pub async fn register_user(
        &self,
        username: &str,
        password: &str,
        role: &str,
        area: Option<i32>,
    ) -> Result<LoginResponseDto, AppError> {
        if role == "dispatcher" && area.is_none() {
            return Err(AppError::BadRequest);
        }

        if (self.repository.find_user_by_username(username).await?).is_some() {
            return Err(AppError::Conflict);
        }

        let hashed_password = hash_password(password).unwrap();

        self.repository
            .create_user(username, &hashed_password, role)
            .await?;

        let session_token = generate_session_token();

        match self.repository.find_user_by_username(username).await? {
            Some(user) => {
                self.repository
                    .create_session(user.id, &session_token)
                    .await?;
                match user.role.as_str() {
                    "dispatcher" => {
                        self.repository
                            .create_dispatcher(user.id, area.unwrap())
                            .await?;
                        let dispatcher = self
                            .repository
                            .find_dispatcher_by_user_id(user.id)
                            .await?
                            .unwrap();
                        Ok(LoginResponseDto {
                            user_id: user.id,
                            username: user.username,
                            session_token,
                            role: user.role,
                            dispatcher_id: Some(dispatcher.id),
                            area_id: Some(dispatcher.area_id),
                        })
                    }
                    _ => Ok(LoginResponseDto {
                        user_id: user.id,
                        username: user.username,
                        session_token,
                        role: user.role,
                        dispatcher_id: None,
                        area_id: None,
                    }),
                }
            }
            None => Err(AppError::InternalServerError),
        }
    }

    pub async fn login_user(
        &self,
        username: &str,
        password: &str,
    ) -> Result<LoginResponseDto, AppError> {
        match self.repository.find_user_by_username(username).await? {
            Some(user) => {
                let is_password_valid = verify_password(&user.password, password).unwrap();
                if !is_password_valid {
                    return Err(AppError::Unauthorized);
                }

                let session_token = generate_session_token();
                self.repository
                    .create_session(user.id, &session_token)
                    .await?;

                match user.role.as_str() {
                    "dispatcher" => {
                        match self.repository.find_dispatcher_by_user_id(user.id).await? {
                            Some(dispatcher) => Ok(LoginResponseDto {
                                user_id: user.id,
                                username: user.username,
                                session_token,
                                role: user.role.clone(),
                                dispatcher_id: Some(dispatcher.id),
                                area_id: Some(dispatcher.area_id),
                            }),
                            None => Err(AppError::InternalServerError),
                        }
                    }
                    _ => Ok(LoginResponseDto {
                        user_id: user.id,
                        username: user.username,
                        session_token,
                        role: user.role.clone(),
                        dispatcher_id: None,
                        area_id: None,
                    }),
                }
            }
            None => Err(AppError::Unauthorized),
        }
    }

    pub async fn logout_user(&self, session_token: &str) -> Result<(), AppError> {
        self.repository.delete_session(session_token).await?;
        Ok(())
    }

    pub async fn get_resized_profile_image_byte(&self, user_id: i32) -> Result<Bytes, AppError> {
        let profile_image_name = match self
            .repository
            .find_profile_image_name_by_user_id(user_id)
            .await
        {
            Ok(Some(name)) => name,
            Ok(None) => return Err(AppError::NotFound),
            Err(_) => return Err(AppError::NotFound),
        };

        let path: PathBuf =
            Path::new(&format!("images/user_profile/{}", profile_image_name)).to_path_buf();

/*
        let output = Command::new("magick")
            .arg(&path)
            .arg("-resize")
            .arg("500x500")
            .arg("png:-")
            .output()
            .map_err(|e| {
                error!("画像リサイズのコマンド実行に失敗しました: {:?}", e);
                AppError::InternalServerError
            })?;
*/

        let output = resize_image(&path)?;

        match output.status.success() {
            true => Ok(Bytes::from(output.stdout)),
            false => {
                error!(
                    "画像リサイズのコマンド実行に失敗しました: {:?}",
                    String::from_utf8_lossy(&output.stderr)
                );
                Err(AppError::InternalServerError)
            }
        }
    }

    pub async fn validate_session(&self, session_token: &str) -> Result<bool, AppError> {
        let session = self
            .repository
            .find_session_by_session_token(session_token)
            .await?;

        Ok(session.is_valid)
    }
}
