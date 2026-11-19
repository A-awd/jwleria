begin;
set local lock_timeout='5s';
lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions,jwl_internal.term_translations in share mode;
lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_base_variants()'::regprocedure) is distinct from '3d4dbcaf2b6998f9732f1e9d822283cf'
    or (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_product_variants()'::regprocedure) is distinct from 'e32be3838c335431ef4ed1620ac2d097' then
    raise exception 'Arabic option derivation changed';
  end if;
end $guard$;

create temporary table arabic_expected(id text primary key,ref text,brand text,revision text,old_signature text,new_signature text) on commit drop;
insert into pg_temp.arabic_expected values
  ('c20e6d52abe1c803bcefd105c3f682e3f95481f1dfa8ec1e1edab8a7ea37850d','A039AS0X02-5544','loewe','28c29d400e09762846bdadefa1d375958fa0bca6c8c08be512267518d85f9098','5f3c33af4a87d2423150b2e66081c53e','e1c84c20ebad5684e100546d0446542c'),
  ('163bd309655b6f7105fd2da56f0ca131cee8a91e04f4ecc339775fdf822ed293','A039ASRX03-5544','loewe','c24cb5f5dbae3911239c5200eefa9160276d235d204b841db11398b5aa234cad','0822b48f379acfef5cc689b9822f3d47','995c0650aa692e0a98b038568061d5ff'),
  ('50935fd8056cace4281973a255d331a77a527b5ccffe3b62a4d0d3449b916bd3','A039N07X16-3969','loewe','8118a209da0364f973324dc3c7cb5f6fa8508c0cee990ef3d3e39ca04341f4d2','3450deb8801b616d00f1adb0985c2193','19af8f63e0f76df8807dc28a8ef7c1cd'),
  ('b0b6005f1d8f6af3f6c52a0ed6869bc32da71f2dc84eb57ad35e6fcbf81c5b6e','A039N07X24-5544','loewe','62cecd6d4257c484f7b19440b0a5148d91d45193459ff82580eff89a228654cd','d42a11ae2e6723686228f65afc693846','92d5f48da16e7a3cc807c5a269a9a2ce'),
  ('2843c6a9bf178130e4e8dfb24ba84b30c1bff928e39fc4d19476419d50eb2d73','A411FC1XD4-7240','loewe','7d0b36c72a790963e3aa5b3dc37f37cf7ef3443d2ff4a4943fee20dff8b4b828','0c2efed18958bf05dd26032377c055b4','62913923f4b392ad42a68e07490cd161'),
  ('c7506b00c9d44051f134b2215d3a8a90985c2ce796975fd5de5a5e91b83c2f38','A411FC2XA6-7240','loewe','9a8180d7e02c55100abfbee278b3dd6765f48d944ffc233fe3092ffcac858841','5a626a084629f36d5a0e409f803bde47','3527c1967048ef48c7630eb1bc5e142f'),
  ('6067c6df6c84f5cd77d9af4bcf07cbe61c3773223a5b02c214b73e1f937bb812','A411FCRX02-3969','loewe','7f8e930da2d898228286f28d532181d704f144f7c4572006d197e1cf2073bb24','2a68d7aea4e713aa68cca2f168210d53','d729689f9f6f056079ad319d8905e898'),
  ('a66c2bfdae16f1a1c97a824c0dcb959da28694415337df79df65b77b20df74ad','A411FCRX02-7240','loewe','c70471555f87900d899b134cf8d3d5a598167e593eb8557decdf64eaf2ca7722','64f50ff4b89d0dc7209c72ab56455a4f','7d1d730815767e66425ab4aea70e179d'),
  ('ab00e5f21b12a651539fedc1e414a7969afc87376854f0eb6e1489ca37f58d39','A411FL1X18-3969','loewe','ef2cb1e4098e397c7ec7c97cd8007e1e885fdbe6dab1e67c1fc8ae49d8849480','8cfb3da16bed46e1128fb88710073831','7295d5bb84d90c2b8c5bceea161da98a'),
  ('08c068559c88d406227b227f9faa0c8d0b7a720adc3f521e647b814633767f67','A411FPDX44-7240','loewe','a6c5f3ebfccaf01bcb3fcebf37f510d00431223d6eb8d99ab6e25ea2fc79a7b3','479e15530b57b46184133c109b40a13c','d7e2dded5dbe2916fcce45ca3f42bdf2'),
  ('f79af2b739c9acc9f1b9f59ca74ac74514611357191b0a3c635656fb78d3b11e','A510P49X26-5544','loewe','1e8f09f9f1a24438ddc4807d1cafb6b8b32ab4d741960eb5cea210ad617e06c0','69fe794cef78e49746cd7a3e1a0dbdf4','4f1aabc577a8b110fa6697e25ec50b5a'),
  ('bfe99f090c7eb730ef2c4a34ab776a8523e4b92476c52b74e3d991bc4692e335','A510P60X41-3969','loewe','9dd3f26715190725f5b94400ff20f260c7b9e4fa749b3948d82d169fa3c8dbf5','1023adf04464dcddcbf1671e339fc6a5','e9ae71d748f8c3454da945070dea1d10'),
  ('e670b2d5591a5e62c2d91bb9bc7d7e37d5bea28a0d7c67280a2d6d03af5f29a9','A510P60XAC-7240','loewe','b8233c3ed9e1be7431f69714e880fad3e987fe16faa5a4686120f68fe7ef9743','9d40938cc4a322abe1c165f6dbdbdb3c','bb3ce33bea32d34c9a6f8fa6a9811cf8'),
  ('3d61b503924cbda23d81d2170effdeb79571bda4946fc7725dca85509cd21e65','A510P60XAW-5544','loewe','4600a086cc922866018e95937cd5b45152ad0162bd43f416d0f9cc30b944b331','46d1a4a4bf458e7f4ce1527b4ccae2b0','50ef5f5228f93e86f071ae5fcad0fc59'),
  ('d197f0a3b9ced2744ad3aa00880eccf85ede6899af0f598739844ceb16befc1d','A510S21XDA-7240','loewe','20e7a4d7141cd3ddee759574dc18f8b9ecfbc62bef10886624441203c8f2da90','da62a72f560069078532d81d1801d51a','9cfbcdb2f0058fdbf5f8e1303dad2c7d'),
  ('dffbf4a4b7d23bf1822878e4963d642c09e010b816f1ecc7245cf9329a69c4d9','A538H13X23-5544','loewe','2d4f60817412f65e277bbd0d65e9f4c867fd1011282d98cf4d0758a5f1769ea2','88cb6e4d8ac730a62a8e6d8ac9d2e4f2','2564ce65863ac525f0ad2779fdbdbe22'),
  ('6f67333276e2b34c617ac9d93ecd762e33a6cc15995924333d2a2f77c349a655','A657G50X01-7240','loewe','a386d746e7f391e8649911b9daead9774583f294c9c42f094206cbd74307f5b5','8a28a2ece59350cb4f14a186ee23568a','2b28d28e4af357c4435f001427596f6c'),
  ('f484b31d9a2e2c25e20ca7ce7e704b5fe58603eabed6699fa98199444c0e8f26','A685B61X01-5140','loewe','98b934eb4c16de96492ffc1f7c66df14521ac2369adce33f489e3c7e16543c1c','6ed0afe814be057be710fc4bc875b3f1','0bfbb43cbe8e6a5bdd44e3f934c3441b'),
  ('11100880ba5236181a341e43e2d13d388c616ffe8798c52d9432fbaa6f50a52b','A779PEWX04-5544','loewe','5e38e3d65b777ff46f3a620ead9cb82396f92a05d4fc20523366b7debfa33941','f342d898bfc4041171f9714a47108e25','b8cfe303802a00f7f76c2241226a622d'),
  ('23409af8834ebbd6e5a253f9d3220aee28d7c6498826f489386c159866181821','A779PTWX01-5544','loewe','336323324088f275417d1b5ade26e1b261f100b268075a8124efd03906074df2','13e7f3d52eef2d0d061482b66817069f','66fa0e56b197aa70d14256db140bf7a9'),
  ('43fbc7fe7dab53a6852a45d3df99d6ac87909e9d46fd44f848b1437521f00907','A914NCHX01-7240','loewe','59e24550d81564372321254d283093494adb91142de49e03d96b71b69885f193','7a547234551516bad95384b9951108c8','c22148cc25037a3c5f3afae9e820303f'),
  ('97e339c4cf0018feeef3393d3beef650c60ee38621cab5955dc840c0bffe6a72','A914Q37X01-7240','loewe','94b256cd6a69277044a9cca45e10f4b7381d3effa8c0e2dbd08296529dbca492','f4b04c38bd26d602c86cb6cd56ffccdf','a06104c06df24f78407e27b6771409e0'),
  ('8c8843cdeb48e55fa2b0d1f71f3f9f513740c3343310f8b8fd291ec9310d2a21','AANBAB1X01-7240','loewe','5531fb9d4b884c6e1db09027f9a3f84c56685b4e25393535ff14558c3c6525bb','ec452ecec47134c8b972a74e07927afe','644b718f6460f39c251f149b8abe93cc'),
  ('c97d70386e6cda3cb674adc33e7201e9871de4bea6ed88cbb2bac14549c349b3','AANBSPBX01-7240','loewe','c1a4d5e678f2efa8c1a099fa8c21db0a5c59ef3a61722880a80448db4b108951','fcec806d747d4ab528baf32b69ae74d4','659f027e678fb333181d3e2ba60b0f1d'),
  ('e7d90586adb6878dbc2f94faacd3deb07c014a607863a0b4ad712b84be734958','B039AMDX04-8618','loewe','a338739dcaa15116b379ab0d1cdb57b49da553a9f6a0e69469e01bb15a75618e','3b18c0c0753c91403429b69ea1e81147','f902cf549003ad39b62e76bece3521e5'),
  ('ff9b170033e016669f73b9b981834428a9fcccccbc65887d3129e662b9600ba4','B411FLKX01-1220','loewe','4d452d4359be296ce0f50b0d221ca7332088e7cda346e9f47a1c14091d3d34ba','327c9eec343c33d20eb3f02e2d5d4466','bb85765c21d6c3976aa667c7fe17d6e0'),
  ('b03f7e8979350f35a890e2a2ea49ba9aa84a5afa8f5d874665e9ea93f4b57331','B510PNLX03-1220','loewe','1918386e87650c0a44c3a72098b87de55a0b4f7863dcf49349a7fe5508ed29da','590c83b34876c36b0ce17f0d93b35a99','d619c6c6001a9a7f33e2a6694eaba1b6'),
  ('72445bf8561543f87df86dabe5f4724c683c40b740594e0c45b5193e09dca39c','B510PNLX03-3969','loewe','eaf7313e567eebe70673ea2257b99bb9d8ab6639ec8e2b6f241d2efa97abb0a6','2dd070494655c8d0d2d304c699456137','bf7944a5bebbb0c0e046ac2fda75eeca'),
  ('456feb4d69a23ef7c7a494fde45625e68a38c5101bedbefe7bd41fe539ffe464','B510SEBX02-1220','loewe','6939c39ad99361ba643b16f6ffa5d713d325c00b072eb5f1b3b3679cc123e3eb','562ca8395cb960bd10d2936bc0c53139','4fbe7c82369b5b2ffe9b54f62fed5648'),
  ('6a20dc435c52935e99e284c904eb21d2d263ef814e8fcf7bb2f6cbe4559607ab','B933Q18X01-1100','loewe','44b86b67bd640c3b5ae91ef470b2ada8b4ea9d8c9ea80bc160f2dff4580a2aef','83169c4119921aa6699d75bae8913372','4c792b0d46044c522c422432e9dcd5d4'),
  ('bb5efb6527ff710837ad5f2931e07425a84ab3e6e2fc1612df4899b553b2108e','B933Q18X01-1220','loewe','fb6005f6e1d1221ec13b95a4531668150ccae8b958963add89e9890a50fae2e8','8ae833586c6edf9c36f4d86061a80371','fa27875b07ea4149a99c76eeef4dbb17'),
  ('7a9e5663747e2213ba5956e647fab2702ff1a67d71d58e8a9ac841516dc1e1ae','B933Q18X01-2586','loewe','32f7093ada5f4aefc54ef4cea665e25169a6fb0a1686b97e64fc2288b5ac66b5','6131bd218156d1bfdef9647980dc140d','182d7e0491083fb6ab05fbad383e8927'),
  ('b09c316ba938f58ce8c317795af8bb27ab9293cca17d83d15dfcd2b499a92f87','B933Q18X01-4467','loewe','d0e130ed4593c3578ce2d75e792ae54474107469fd84f3a0a2e1cf312e426ed2','a32c802e7d603db97f59e1b37302aece','63392eac52fedc84f7772a2f4d171a95'),
  ('4348e8e58eb6ce3a14135dde5931a9438a757f2dd43b4896167c1894b3dcf81b','B933Q18X01-5884','loewe','70a371eb1509651bb97a68a7cbb0dcfb12f4f7e5e5dccbab4aea973cb3e7c8b3','a461d19a2c33529af407b716472e7017','c3769f201ab29bc0e031492af7251948'),
  ('df416f41a7a7d8bbb15ff05806b792c6478c4d3485637b357b2256aace71b957','BANBA73X04-1220','loewe','2e12b195482e3fe9dfedcf5bc1490aa48e4111ec7e42e694571a3e0f218d52ed','3776f6f0ec705a4c12d08bfbc4725ed6','89026a6a19d2691cf0eac09466035dec'),
  ('4d6a49cc741d3d5a8d17113023184dc36a995f6076c5faee5eab48c77a42c24e','BANBA73X04-3969','loewe','f9470be53b92501ff2b52aa7ba444f4adef401325297af28b661de2511aec4fb','0408b4b0ea9e4336ffd302f0ab79f335','65430c7a4070e12c513a4b141482dfbd'),
  ('9c21ae053a09f1646e5ea6d524b95c486df8dd74bf6f6a83fbffe318f9cc9fdc','BANBA73X08-5544','loewe','bbd05c61a65c9b6bcd63aa413425575b02c98b533a5b968d738e2d312085b2da','a0720ef418d1f5ca95a3ed484b718e97','8485c6635643840797cd5ba3a33dc3d9'),
  ('43041ad9d866caca5ce76f421117317dcefa12919fe822a980971d03df795c5f','BANBPCBX01-1220','loewe','279454f3e18829aff36f59dbccb4a5bb246611f2323e297c165213c95795f3c2','096f4eafb730ec84ca68c0acf4840838','72b93c283f1f21f6ff63b5f765fe6326'),
  ('1339b75153adf035bf490779dbaf480b2259660473cdafcd48644510c26bec0e','BANBPCBX01-3969','loewe','7c435f219c91ccaa956e8189756cba446a0aaccd6ff052ea2156e1bab7bc047e','44f8955d2ff98714f55376545cca4117','2c60e4573e86042817abbdb86fd20647'),
  ('e544f5eacfb1275d1ad2b2b9e1be48657aab654f23791dbbc1b4f4947cebb1b4','BANBPCBX05-5544','loewe','6889592925ded85a01d83160c9ded2de36f8fde79c2ba3c5042ce9ca98830805','38bd00fa875fbd5584cbbd886bda18c4','5c9dd68d26a38c12112ac73897c5af33'),
  ('ea35dbfd87899f50478fd6d19e26c389e1c29a9609d7ea1a020b4d23bfb6dc2d','BB22CMDX01-3969','loewe','4744a3f7a2f31fb243200c3658c9b7854485a9883eab0e895d30f41f8f82a087','d82c1e2bf0558be678a8b7f17df72d93','7f6eef7538920434151c7ded4bf684ed'),
  ('33c20636f75f242bb6fcd0a41a495836984cd44ec9b2dcf84a1de5c964ef6465','BB22CMDX05-0360','loewe','cc080737d81e52a2fc2073dcbf057e76e01057df136f3025c4d9ea9d4f4eb6db','1a01cc51da27c3515b41aea2eec5597a','a47924017277afb20a0a02515b3ad928'),
  ('6f161d027d3daef64415599be9d9d675e09048b66752b7088dadbe4559bfae35','BB22LTTX01-3969','loewe','86e72575c4104a14c1583ee437a91640a0583c2cce1d7867435c0e9ca3ae4fea','73f1752270d1e9f85849f50235e0a9d5','94effca0f1d243be5bf7689904a3ffcc'),
  ('24dbf3d159329a54dc58abd37378ebb9bd07cc7ede03923def9c3fbb99801c42','C510302X16-1220','loewe','478aa98c33b7eeaed7e35d12e726d92ceb8702472e6f8f0b948780230b7254ce','536a1ac5c2134e99727191cb7aa8c329','e7fc878eb92125e8bb63bbb6799e645e'),
  ('9ade66bdf891e1402fe82dfcf3b5ccf5bdd7da495ca17444fa32adaab113c862','C510302X23-0362','loewe','cec320d6c9f25f00fe3e781e1f1871b8f8f103472a5848877e36b92b8f9f8fb2','acfe8b292b133789b24dc1c7568c933b','0f16fdbeaac464c98dd0c57ca8161b1b'),
  ('466b8a9be5975fadc07ca09699d265ff18668dbdb001e4fe772afc26ef561012','C510302X23-1220','loewe','da36f9240a949cceaa2d528d323c33d712b0f5cf29803af1581be7ed6f85ac1b','2268b82ce8a0c21b4b6da2beb852db1b','39e9f112515179522397e0e3750d62ea'),
  ('409ac2e15df874ea49d20b518497c3bc8d7ddfec929a9da86bab9a3ab8edc58a','C510501X14-1220','loewe','19c5f265e37b90960a32240fcf12f0a23f0660894d33dddcee5fcf83cf8cd9d8','eb87de47936daf51363e18c090c0c0bd','3774bf51fe983ba3dedb9097057c3d29'),
  ('6d344c273efd0c0c373d83a3a2695334d3e8c2a245e2eddfca18fbc7084869cc','C510501X18-0362','loewe','4508f2d15ba845e4cc5a12735cee5da6cf435fefad0c9ebb87ff46b327200761','8c38a7e8ab8ea2914f2c730d35f02813','0a456d5bf9c70c5001e781a8bbbd5597'),
  ('ffb98c8bdb6269c1b5def60988366360fc0f8db18a05f161086fbc596569262e','C510501X18-1220','loewe','f524e2cdaf63878e8ca413a69ead71650d803a18f91769a14309b886104337fb','0f6661435c2b4bcc1f334bcfe3d0087a','1776aa8c796f864df35407f4a4f6d1b8'),
  ('eae80b1091042d84fcddbdce96a2aaabe2786e3b80de818114ea75b9999af315','C510W73X08-1220','loewe','dab24ed2dad40166360115f5a0a0a475165d9aa171c8e3b290078fd2d4ff0c27','d395206a2b5f077c6bc8e52876306bdf','355394d95b6dfc0635f930975053419c'),
  ('0ac0e193de78702684fe58a8886c62d00e0da3308599e2a6d42ab02b2c897a81','C510W73X08-3969','loewe','82a71a4f8f4659e3fe2e134ef8e3c854c3133f2a50d5c33efed67417b5f38add','78aa48da0b8a6c3e9dd49bc7405ba04b','759ba8858a3b3c32eaebb7086facf4c0'),
  ('f79a991cce6971f208067a7b0ea658526a3979e0a34410d7c3387467674747da','C510W73X16-1220','loewe','72691744cbc594de05f9438ca81d2d389d9632d1d73a27601a60e92ac8ff5c23','8a0f2115cba5ef28909a80629ca1ee44','22835ea7e07c80c5900b0297764aa7ae'),
  ('1cd32d4bc524556b560bbcbc7179dd9383c875ae2c6c5d62da358ea3e4a2b185','C565R41X04-1220','loewe','ec02c8898b648f3264949226079becbbf6ea26b02cb589ba1427b4708228e249','c7d6c239e8d014f27b7f738957d2a5b4','a6ca4eb091278e69566e87f736da69b1'),
  ('f31e7ddd5cff15ffe4ab28454e899348142032f8c6d1581eaa287078bf1a0b9e','C565R41X04-4160','loewe','a6e93c81ede155e049548def82ecdc355c0c1f6c48413fc2527452ff1aa0742c','331e3aa009fc0dd198187360d35b0fff','2f5b0d1c999c291c3d07987e8df2c43c'),
  ('4a78758ea39023a2f3205175b1c6a9ab1ca7e05af4a89c49a26805e3dfc6608f','C630R10X03-7240','loewe','40156e2c3268140095ac56ace7accfdc6ffaf068c6bfb557bc1069fd1d6378d6','5a89f0b5adaad1e795ae1a9c0b47cf3b','0997bea1c886d7dd00ddddf20c8c5f60'),
  ('f2c4155519a40eada51034b027e7e6fb6caff8888c041c62fddf4b7254e9c4d8','C660R41X02-0362','loewe','24edd704a509c8f9c5bee2019e3afcadc25cbcb1ef34e8d3ef31ec0bc3e9dbb4','f86f7943c4b01a85b1900a3721188674','a7c0fb9efb16809d37fa5c05d9ee58cf'),
  ('ada742ea1b4a16fd78a47d8ed36adca89bb7669ad134ffb3415b3298846e93ac','C660R41X02-4160','loewe','2c4e31be542d773231c2f0894e75ddf68278528d9955abe1caf567483516c5a5','74d7dd281c88739dfe4a70823da6c2ff','9656e7f015f39ab189c252734cddbf6a'),
  ('8cc3a9277cfbba53e9e8f5a6308eea294789b05f226444526456374523b9c371','C660R41X02-5544','loewe','fc21ab36b4007e0b1bcb1626cdc6c6fe3cb03f278e81c6ea3892beadd346de5d','550029bc7e514e076fe1c1fe3bb65e98','23923884fa2af4eb796150a0682cce3a'),
  ('086a846115bd9cf3c9a0eddc467a36cdb3a1649becc190f892c7a6bcaf03fa2b','C779302X02-1220','loewe','9997aac25baae437712bb4acc6ab3a10f4da96603625d34514fdad318f0b8cf1','0682ac74a68ac4ccb0a76b5260c2e24f','da5ff7e88c440496a59461c036db2fe3'),
  ('d5785e999d31164c724636c087dc954b97a8d7bfaa6f4da2cbeb7561c0e565b8','C779302X02-3969','loewe','ddb282f38eec57b3421357494f5c8c4b7b627bca3663aeac4c7d16f484b152f2','ca17989fced55160ff8df05cb0d35dca','61226c7fce1fc4335a80721de5acb399'),
  ('116a5a8367902262de25916f80d226bd34232b32a1ba86626959c0d9160609a1','C779501X01-1220','loewe','de657c32fb64a8c30ad737888c8adac56e9b793df7741d63460d25bc15b0d563','9e32ff85337307bc5a077e86006a6ed0','b34637c4fd8254e06903931a7477501c'),
  ('46c1a0ee9d886fc4bbca2e254f532e349c9747e6e437f4d54bab903aa32f9541','C779501X01-3969','loewe','3b227e0cdf042794cd55e4f60af979371f3c888070c05728cebb483229db59d5','0c83875740faa712c9e96672bd9e2fd2','f1434af3870fa1723062d84c55801b1a'),
  ('8752cdd02788933cae2a9ccaa6f1ae35db21db92dac3039e3723f2e925161e47','C779W73X01-1220','loewe','cbb57d277528799b4e5f636986d4079e122a0a8d387074fd6ab1232d30985201','3741b89fbdd8bc830a67c93f8fcca02a','683a179e676c4c77ba937652519fcfee'),
  ('3161eb80ab7388123d6716a303d5e21567f45c3aa9c228ef97b5625a85f0e4c5','C779W73X01-3969','loewe','37eb6ff5a11f9f17f2b1326741ed2d3d7ef5754f8bc1b7e38e1e22e16be1080a','809d4cccfd5b9fa605e64516784a521e','c19e5c7d7321736c92d932c5a1f8f68c'),
  ('a0caad674dc33d2c841358c71451d390b7504f89e976659801ddbd6c089c041f','10166HSR892','longchamp','600a2a9ddb25f19fad6e3bc4306510d3c089ff9964db21748b908d847691a5bc','c97640de7603e9201f71910b6d5f8042','9ff84c1cc181044e7a47f922b27a5b44'),
  ('5a8bf314030cfa46f19481a41a28de6455ff5a681c457f3ea102f3f2c8139937','10187HJJM68','longchamp','f9d61f8717e5bfcff13dd5b3823b60d56b2274d6ebda43fd844fb25570296d39','e7eb27df060b6464d53d489b7f512db2','0452fee4442aa333b9de99619afc76da'),
  ('5295151615c5d010d3794210b09d85ba9b5c8d38fded912652cc77293b1a9de9','10197HCV292','longchamp','b846665b6c87fbb5b15826d3f19aba4c7e14519c95225697df0702a68b001754','775af3a2fff081f31766eb6e99ea35ed','ca8472a1dc988b5f3ef79f0c52695402'),
  ('16ce8028851e63af8009016e6a51558a54093b388779c0d6247110324d896ca0','10215HCV292','longchamp','00c170df65d98fd33be71a2af13ea3870b1ad4fc5672a8f233b3f6743cf117eb','ce106e3ffdad3091d72c7c4541865229','238b84baee9ef1353223901447dfbb31'),
  ('3b53c95a5289d3c32587a463ec2024a9fe76ec071bcd534f918135ec35f7a8b0','10256HSR892','longchamp','f67c0760c2b917378e545bb6b2ac8c57dc791a7c16a7ad30ff579d59abcae90f','14d1250de6e9eb647ec4aa58b06139e6','b70bf20288ccc5ae6d094b939f45b97c'),
  ('5f1127055faaa9eda29e72c4dcb914760694e63414b4f1a088aecc525b873dc8','10273HFP001','longchamp','77d2e5ce283a9ec4589e0e45ae0f3cc8fff33d513f115d1b1714a20e81b2626a','6b0f50126aaaa23184dd96b9b533a25b','43b80847e899cca3a8d81654ecc95ab9'),
  ('8476ac9d7255a6baa73220eb176523b6fd3c2073b61357a6b44dac96d59fb15d','10273HFP009','longchamp','24f19dbe23b2bf6773ba011cd5741936abefee8b777021db77445a2e67cb603d','f21d0f3b19ad071ab8ff4d90de45d03a','4ffec825908b9366fef5a7043ac701fd'),
  ('48e0044a9fe5f34405dd521e30b0bc58caf2a8844650dd830b5278727ccc8d3c','10273HFP266','longchamp','428abb086bee8f0a34360f5656a49ce2df221e256c2fe1ab50cc58138ed2c0a7','f0eb3b91a23ff9a578d397116f5d83ab','aea61f9339fac7fef8434d46e3c815ca'),
  ('20a31449f954bca72c729c6778b651d97a22168d770de57672795fa4067d9bcc','10273HFP371','longchamp','be67955ac7180997ada0dc7b7a5a272b515aa5133d9d48eb2dab270478965d81','7e1374a5d6e262960323b1b364e5af7a','c638fb78f8c6637e485ba85039f11b71'),
  ('36409e87ad620baf3adc8221cc38bc25ddbe47b043cd03b8ce4fdc5a6e1efb7f','10273HFP555','longchamp','1cd8e7727589418b865a87df99375e88d26a9e0bee043b7f2a9d03133fc6dc18','3abbdcbeef7e15ffa455083b0901c2fb','654db81266d36542e40f025374e2ad22'),
  ('8310ffdf478a951120e233df7dd0391336e4fa6d9e8bfd745e55909ebc4ba185','10273HFPM66','longchamp','44d7b06cc7161d5f2166d3dc9ec65c9e0918d6dfb2df30c7f3854d22f246ff00','5b9b918bd37cdc87cf5b2a98d810ae9e','a27931f5364df0fb70075a09d42de4cb'),
  ('71155910b280d1498d77387c6eb1b71e30b2bf075cdf1bd118c41968dcbc134d','10278HFP001','longchamp','ec1a4c84654bf2f0a623d7d4a57682c4000f07128502d9d99c68c344507312ce','ec1c71af2757b6c0f80651b7b52d8f6e','0a74e22b9eaaa8e64be7665f9fc4c7f5'),
  ('686da836240f0d07d672d86d06932ba29a8ff1c77acb1b2c08d7ae3e9f1bda65','10278HFP009','longchamp','6041b0bcbb33393387ea134e1ee55895e63fe5e7166662b3d369579d073e3727','9fdd20f2badf15c8df9aefa44ff8be80','9b72cefa39bb3296b3d1376bd31792f0'),
  ('4de9f4437da23c4ce6f5921bb685a155de30ce9206acaea7b669eac87a734e85','10278HFP266','longchamp','65a0efa252f5b73a758524c6a63c66741d18533d46afdda6db5ba3a19b68b069','2fd9c25fc28aa4e91439a6b3fd4791c7','5b356ca4973d712717234a503cc230b7'),
  ('45422f6425631255634e8a0c46f9ef9a11ee43aa7842681bfd17fbc0c520dc14','10278HFP371','longchamp','4ec92b5ea08f8aeb2fec4fe03122cee15f3f20dbcf88ef611c44d49e41ebdc6f','1568c96397396124e193145d536fd174','2ab7e9692e0465031b7730b641fb2fe8'),
  ('fd7fe095b9f168c316b85139f911f973e1ef132888e1e6a026b4beecc23bfe9e','10278HFP555','longchamp','825051fa6fd3dec1fc8c0e237e71279e35a432b275733e6b8ccf2144a6e4e6b2','bb52e3a0ee87a5b4e008913a475927ce','addca5de0c61eddd55a4ea8951056f4b'),
  ('14dab2721b90eb7e8d3090aa4ef2a66b5d8723628cf03d25ed4164468a3a7ccb','10278HFPM66','longchamp','d5c6c4343e227f425f64f60ce02f92a8480fe53e4aa3678c90688d7cff460152','ee8491ffcf5c8816a45780f1503413b0','60b0ccddf0cee576e26f4dd0c4873db4'),
  ('fa2d66af922ecc910e3e8962a101cc6ccb8f85e20531143b5eb9b8ca6344adc7','10291987001','longchamp','3db8ace2652bbfbcceb94c130cb21857d65cbb11b34dd6cbf620a1d8c5bc9172','b2e62883e91134327336447bba584e83','2e9d1b9a86a8ec3882e6b98a00dab5e3'),
  ('3c99aa9a57c65bb37f837d9f2f9ac730de0e9883911724ba73155c847cadf3aa','10321HSR892','longchamp','15edce5e0342c2ea4b49755bf663d9bed06b29c886512311a611741188bebbe2','e82f9bc7942d3033410910ab4bbe073e','49576c9cb98fefdca2a7772145f2be17'),
  ('2bf40dc3f83df5581be5fe293bb073fcce1e1cf2079ff2999169958fd399422d','10328021407','longchamp','ea6209d9ed517c8053b217f15573775b6827aa352d18ddfda76de9b99f26e3cf','bbbb0a5b4b3b0b04314990f2ab9883da','740a8c276851d0819f516a51e6fd482e'),
  ('280616423a352a3bb034c07551d4675eed359b7a154f13afa1a2f6674f3e4d8f','10329021407','longchamp','238486cb5dc1938226d51ac374585b789ead9e71b3248b1f6f0ab948a50823dd','503781152f0f74d8a71c53ca213758e4','2f6598b88f0e341abdd037e808cdcb06'),
  ('69c0ba4903881106998cf002f9d2e4152bb06b0f2d2ea2e84b33d0abb9911f55','10337021407','longchamp','ec612ea6386ba83caa0f20fec8fd6ddf11027632054d2658e467cd45207cac6b','9ca0c98b57c28a830d7171dc73578033','dd02864130f7d3596878a999637d5c35'),
  ('20f07b2d4aa4e6fa5fd43c8a1ce8f1b0c8a04eaef80946cd31dde335ed2c37a5','10343HSR892','longchamp','a443b5cbdbed62ae7ed91d3e67d6dc3b3476d5369c77d82a494b8ae566d9c6f7','7f3c365e1d149c4fb2295609eae89f98','8fa178b258e879b9994db7d12dcb52aa'),
  ('0117db2f5c991ba86083956043cdb7d16877ebb5721cc0fdef775d57eb42b934','10372HSR001','longchamp','7383549835803033dcac0bfdfccb1d6cb107d5e647fc2ea123dae749f99c1997','8dfb49c68b02d6e14cf02e1dfe10e199','46d543f45f55c8d074007d1aa26e65e6'),
  ('d5c566240e94ef0e4d68064a6618606a7c5710dbab660442f121d1a090cd20b1','10372HSR742','longchamp','2cbcc63de82cd6dfbc9f2b17d6cc0f0045228e5ca1336515db78c25dae2ad13c','60d2169db3bd45f00eef2eeb7438e8d6','44a68297b4e8f849cc39b8dc818a50b0'),
  ('c35c6024706d4667434819124028ccfd13c8b192d3c6b4f5e837ddf3a1b73c92','10372HSR892','longchamp','e302d05b67b1335776ffdb8113424b97ef1548fb372f60fe5f591a0b443d8f00','254ab80214da2beb84ef6bf465a36c71','8835968a80d57c5cba92ceeae453a6e8'),
  ('0c77f6e843ddfa19e3c4b4b9d6ee76e9fffd00fb8d9cd0e37bfeea7321cd2e42','10372HSRE98','longchamp','7767d70648d5d4f75469ec93726cb6eca565be28e4ef5828c3562d57b43f0a73','c69132ad2f89880b7ad97b2c8e872ecf','f8aecb1161c50a32bf0e7fd00d4e5a88'),
  ('f4eb145ea3fc25e74f81388762d66c2dcc437715c367d92af6fb7d2142846bf5','10373HSR001','longchamp','ad5d5a91aa64dee407906e370787277a4658d28c51d373a736a647f57bd4ea27','4735139ec3dc9618c3805350905f2e73','1cafdf2c306d0c2ab36076dc66fac3d9'),
  ('f072af2f4a5fdb42e947378b7900ed9f03fb9503bc2ad3d3bb0b4aa4f972668e','10373HSR299','longchamp','c6b4bb44caf7734a073cebb4518b00db6488b59012cf59e09b0e37159d4ce790','651935e71e7b4f6efa7a8d79d5e02a19','ce18cb032db9f8cdf46e3a25b9c31f77'),
  ('28d62375112c0cc15a6da562708fd225a2ea2c54e92e6e02a03d95a2aea8ffbd','10373HSRE98','longchamp','21c99ef388357b84f9320d0b22e354763ef6c6f83f2e353b4f2f7f6ffa5973a6','0b32f052ced0f80510862335cd9baf29','d42e34a188ed6ee2f5b1f5a551f72e9f'),
  ('234f42a2239918c8a39c0f9372542d0904972436a94a6e9047a66cc711e92faa','10381HJT510','longchamp','d9d3dafe0de79ee203de08df5ef5d7da687d9584553bc251d6b8035847b2c882','473f305025d61e7ed594ca6c4ea0d101','271947e14cebce89e490b55ce7b55c9b'),
  ('8a6dc4ee87a53ce6d012521ccc7e513860bf25581f434d847dfcf4e1b702f794','20043021047','longchamp','b9c28e1a26aa55a1c2c78d685d6fbbf320874e68f2b2d64aa0a88465ce4ace69','709e9970bd3857bb9e5012147e98dbb6','6770075b2668d84faf958719bb9e7613'),
  ('2cb0ea222b487996cbb94408d593b4ea472bb066f5df8896890c8ef26bb8aba8','20043021F72','longchamp','693cc962e921ec92d19fbca0fedf8dc450b73cf0d150b37c6984c20071817948','1348cdbb21dabc2d6a8cb865322d22f0','2d60d5fc8da42b6193a387a599893ff1'),
  ('9c548cf39529cd7cc96180bf0b0d43a3a5638c3db76139f0d8dfaad558d79d04','20044021047','longchamp','89da4f1373d8976bcb54f3f4ca9f6bce5e8372590f0edc6197ad692c70a1b39f','0bd316a8896a6cfe3e5fc5cb3b9ae64b','b2df3fd7a3d8a931a941360454b70013'),
  ('aedd24bc1a254edc807788ae49cffd976c2a184e195ab7dcd2fdb292d6742ae9','20044021F72','longchamp','6c5b7a98466cfbe87d6b4424cb254a24fcfdfc100977d858fac47bf715fa220b','d06d8b973453b6dd1d72204bf69c9cc7','78bf245354a174e78dfcf9aaaa4b347a'),
  ('780887ff6c878a27d7ee3a1186d63480eab8f424d560e7db7e81cdd9a3059a9e','24024423892','longchamp','f3f4b35794361fdb9b4cc6ff19f1cdb216af2b33afc226eeb56810151a231690','c2cc0ef9218be9a9ca8d26ab16c65bdd','2c9a5bb26159fec842e0579e3c959ed8'),
  ('ae476048c26619c55a289235ac898dd730e562915efb917fec5a292918c30faf','70203PVC292380','longchamp','27dae42e248ee444798473d61ba6cace5fb6a1c59d6fa2cee27ad5217dfc7d0e','4c0049f94a6d9f942c6c71b288674870','c406b3a460fbd71c248d0ff1a65341ae'),
  ('2ad38d018753d3d989071839b87be2faf951fe91220c62e4da90c991d5e52827','L1422080001','longchamp','2385bbb24b4d82cce4174f62e1653cb0fa6d5dce6d0fdbfad23b6d37eeee3053','23a041976d411dd0a6df319bcc7e8395','0cb8a6de2c41162385f74cba54e409b3'),
  ('595983851a46eac84579f53df2c6a8d5f7d2404531c34e2711af504e0e5edef0','L1422080042','longchamp','345fe126f0218d06b6e3da0f89582cccf52b670e23bee5d1777aec6ab9b78620','0ee93867d69a357841cba0809365f66f','5ab550733f6ad2e0aa8fd7f5310eccfd'),
  ('007e427627310491d34d7a0a5d26e058360b0da06351f45608b08f7ac106e1f1','L1422080127','longchamp','001d0acb968f7cafa70e95ef6db37296af14a9ab2825b125af9d4bd6ccd03209','30b5e30aa9f58c372d7a8b3e2c5a480b','5aa622524bac4eb0b4cea625e248b1b2'),
  ('0974170c8dc2f1e367c516cd946a8b411f277197cfe4f0734ea6118aad11cb2d','L1429080001','longchamp','bb9a3edb5e93e8e6fe3e73c3aacb454a7a997c80bb0b6ecff15231016f36bba8','4eab8b537d8778f2b6e22f51ab118e60','ee1c2a3b2973d6e4bcc032536ecef93d'),
  ('c6cbc9d3c10c9ce5bacb997444a295851c3434041143fce3a052afa8201bd53c','L1429080042','longchamp','105779677d0ced82e58d4767b0e439d45c3f9ee85b7e171400d70050d6b3dd75','6155fcefdef19c585050bf3a7731c84a','a96928eeb04173a182d5eea398b121bb'),
  ('934946cd1ae27cdb9a503be3fd0fd075ad1d5d42d67c44d12541c2a41c642c97','L1429080127','longchamp','5db62eb47bafe713dcf9b6bc30562ab29c51a062c57df6527d7f801fe5c83e3d','040eca1fa67d839031c94a279dc179ff','4b909164e0cff073501ec80019bbde46'),
  ('e78b6f3ac96bbacf85c7510a61c2bddf92062b84396581f6dd344ed9487ef8bd','L1512987001','longchamp','c82706bed81d8c8177d8c2139f9fbf1167c8dc5c8c3e0bf241ace470cdac08ee','fd3717cac768fe70120c8da5b740acb3','9311d4898ca4167fd6ab816a8848f5be'),
  ('627eefb5a2a251235766168846da98d54aa0582eaaa7f3fb7156efa076833294','L1512987002','longchamp','1681b6d0d80a126ec2995907c08550b18f2c68323cdae041837e382660e3dc5c','bfb1d1ae5c2e76bffb8a6b5e579a8e42','323ec36e731cbbe6265ff5c10b9e5edc'),
  ('244b0b832b2c8400d26e5e63445ba34870b750d106ae6e8228ef49892777fc1f','L1512987555','longchamp','481634eb2e645f5b0d3324e3da543fe45de5ff8f13e3f0d3f37d9eafe3e80c88','1282ad355c0d31e3ee7a309535f66152','4c227c484ef4d42b342c34a3db86d40d'),
  ('99516a4384f04cd2c519666e283aa1c0a6ea9bf537a813711a8b0152396dc1be','L1512987M19','longchamp','0aeade0e84b646c1afd0f120c368949ffbcbb3c2a7b6bc0ce3723212d097d76d','3779529c5bd658f6caa54f65a1d5406c','5590de8a1c0d74c8cdc71781bcac0dd5'),
  ('1597d2c2db74c2d0a3894e7a27519c078fd78716f52ba86a662a8b898ee510e5','L1512987P55','longchamp','8f2e4b6bb93e6d6c13460079071e2ac945ce2189d9192b5727488f4ff6408403','5c7a56c607490dda75caaa371258f0ef','2e5d96dbfefbfd8df445c646162ec016'),
  ('e71aa70d71ba9593a63019ef952b0bfe2f7ce2b70bff7cd90db904c3dc166757','L1512HSR001','longchamp','b4d88f875b177ede5ed9cb21fbe127f56caec3d3e8c3808476379312ab99ff60','79cee5d9b3cf70992144a58fc2deafc5','943f11de099283fa49819ddbc4340e63'),
  ('6affa7e5a1dcf82d812cae7d805102be5db5893c5bcbe793c36d5bf423326ba5','L1512HSR119','longchamp','07e83625cec02aeba19977664038b28c437eed326c41156ec6cd5968bd585e1a','2edfbe93a200dbb30f6d39a23848f5e9','595da2e1c08ad595befc2e31cd595d9f'),
  ('148fcec858496879eaf4b434dc741cabb87527f56a46ed856e90c03ab73a2ea6','L1512HSR299','longchamp','17557752be046192af8da5e4b74825d3593ba017ef08ca4cf32b6cf4d4c35b17','9e0a3aa5d23a6234e539d6dfd0b640bd','d99ef49975cd8974b3ca45a3d046641e'),
  ('f70f17b7f43099ee8208ced20ca61ef27d0dec077b02970f23d09b7145985274','L1512HSR742','longchamp','241166d665b495aae727f4180333651268358c19d6690446dd3544757be95874','0a75fa768da7ff1077b11678e6a3726b','a678a2489d54be52ec439634ad044c75'),
  ('7669ab2d49cb8ba56efc9a8ccf3644fc8b6b4ca109731a0ef4baf0a639679d13','L1512HSR892','longchamp','492a4f45262c733855528704adea1aaea5be84d342aed44a1a020faa6de99a03','e85fbc732263ed9b34563e4f27cda56f','d9ccc1364371e25da6a08a57f28a29bc'),
  ('fe3d53edc73d5403de44969b8c172b80e14af4dfa663339a2386767d37330bcb','L1515HSR001','longchamp','773641b2c334bd75b88c7a0ff1e2e8c75141fe475e16b74a65d4df21f48c4e17','87c110c0b44bc90d02f153f5e1c35345','80c68928dd9f410afff2f171a6e7ac36'),
  ('436e216725048e2888099f98f51d99d80646d229963e3bcc224277155f90d7d9','L1515HSR119','longchamp','4d7cc0b8bca1211b2f052543e204b098499cb9b5d1e01b15fa6e7eca232c493a','a47b031347c2e79d024a20dfbc828fbc','8f9247093d7000b40b2e0390f30e707d'),
  ('1845de4def8f62abe293b0beccb32703c2828f3df8e1df254bb888cf1f2386ec','L1515HSR299','longchamp','0b4393617c0ed4f367b7ddc701677f707048bc35fae1883a31d0532a510691a4','ab9d9efed5029c73bcb3217db124bf24','75af5a577b4e78c6e983fbde32312e10'),
  ('f271459ec2f9a322da9ef9f1e92ec2ed61ca10dc7e4b3a5b92fb0fe35f6ebb57','L1515HSR742','longchamp','041bb8bc1827a284185e7820e73fef0bc9e782b7ada2f22a1b9079ca9c537403','412b9abca2252eb76b1703ab2343d86a','2676010a50af5e30466576669b7c39db'),
  ('6a220167aac31c0bb704481e8352e1b5edd6e9e37aba7d4b800868b089bf5c77','L1515HSR892','longchamp','ec55881c282879731817ea50d3c1cd1dd8b291f1a0cae90d9bda5b85d0605c9b','0387c45c0d0428bc9dda253208781e12','fabd5a92be08e32b416e8b9eab632d46'),
  ('035fd786143fed74a0c6147e9a675d85629637e29c0b036ea16bcf9f40d77d08','L1621979001','longchamp','1c815e26a1aeb85aa95329686da6afb4b5747dd18a91c3938fb5f6bd8a64114d','6bbb0cb373efc538c1c8f3989f783de4','e8833a7d8fcf51d682259ddd32425a60'),
  ('88dbfae97b45cde25bafe69fa9f58cf78d913b735343ccad1fad3974c0d0026a','L1621979012','longchamp','2d2f180186faa786e8b04ed96e5097b7db27601fa03db3a514cb8718bcbc7499','13f3912a6388c63e52577d6b54502167','d4d83a6cd1f37629b69676df5c0154fd'),
  ('91f95ceed4683e473126a02eafb9071fe9d1b5fb23a346041073a7aa7648b0f1','L1621979105','longchamp','8b82fd1e39ba055dd0be6d0ca248ffe6da8d1f2566268b984932f541bfddd4bd','db5cbeb9b7e40068c13de77e727e6ccb','bafe7c3e38eed3f9c756b6ab68a45ca3'),
  ('0b5923068ee8827f6e1e403844a8e0d23df1072e0bd3eee010aefa3b097a9522','L1621979163','longchamp','a4a15d332b43b9cfde35e3e24e1af4d7eb0cd75dd168c4ed0a18ff90ca62b98f','db89670e2ffce1f2d3a5d4c582394177','e20fd4534cc05c5d1e805fbc8e60e0b2'),
  ('c4d2d0dec02102d39a350373ab42fe23ec3becb1cd5b57481bd9bf7df8225cca','L1621979P87','longchamp','f7bd87361d67ea45c1dfb67dd3ac32d1e6b16160976326efa5f50e15f8db1053','000a22bf16b6d409404c15dbd0192092','c82af9e29d408a3b77a2933a6bbc34a2'),
  ('b5fef2b6bc7e0d3221896556481523f0f96e77146035a78298fcbd8a1f5ea756','L1626979001','longchamp','511e958e8b0379910cc346d6c7bf39a744c5a5c7fae4598bf3c678f24921a375','616f45cc38100181ed94c7b23f071a75','a372147ed9d3c36472fb2e307746622f'),
  ('e69a9efac6e57c74973c0fcdf9fa4a726c7931104fde5e48abfc85666b6f6334','L1626979012','longchamp','91a46bd2650341f989a58a335cb8a1400182cdf4ff255a2c70384794e2f21d79','93e43a2c008e3630be5d863a2e804a9c','fb6a4006bf5014082ecf7b6130eba5fb'),
  ('e7624490b09b19b5ef491f4eeb02098d3d4ca88482d26f2e533f4e509ca1c94d','L1626979105','longchamp','2896b74d40d939402cce62103ab6bc444640e8ed019a820e0bd15ce9fd6786fd','93c0cf8c30e8c2e938d69cd5ed161ca5','3fb45ba6b886e27b251c9c0901f0ad7a'),
  ('c5fea62656a91c3e3779690c5a64e1565853be1b0fdabff56a20aa9c4a09dd16','L1626979163','longchamp','cb497c351907ec90c43ed93a675a555dcc917ef0ef66aa8a7c63fbb7863e53e7','e5d03df69509e241a65597d75ff4e604','ef3b102249a87fed0d6658cee987b818'),
  ('0c4f5e009645f375d1a909ab0727e37a0de5f84613a1e9049fb0825cd563c972','L1626979P87','longchamp','8b562127f62e2b583c91af10e3af453172fcb704ba1a98470144e00ca28dd623','56ada9dce367cbbc54d61a46dcd8f719','fd4d904ecfeb2617af80eb34eff59db3'),
  ('8f45964b38262ae14f1de61c358e73b7ee0c2d51e7e12e4879a95ede9cafec6d','L1712080001','longchamp','516a9e6e13e6d83fd8858d5b915747f04dc474243317cf6c12063607bfeb7ec8','59d5c26e6aa10c7dd2d97dcabf278513','9b98fd23d9a9693c32bb90588a499f9f'),
  ('c04b22269d002f291f5c70d15d69e2ee3fd2af1712b5d96f597c7dd450e3b3ac','L1712080042','longchamp','0a920103d22c261440799f29530f7e5103b452c3fe8de4ae028ced0784ea8db9','d28b614da45505e573ae0aff58fdbc48','5bce28e589652c8ff5311d7a8240c179'),
  ('86056ee61c708faad24104c538902815c3b502c22ef696e23770ce3d74bc83b4','L1712080127','longchamp','1efe2bb97652ce571aedde920675a86f67c0d6b58ad77a699da28273ea6befab','a1a36f7644ccd790a3eaee147e0fdb8d','032ab92bb90c3965242e1b762f550258'),
  ('4efb69e4bcab78c08155ff80579831971d01c9fbe02d6160a8cd37e0ab0981eb','L2824080001','longchamp','d0166839d221ae831aca462b2a773376f6cb24b17732e334c0b79c4e9a42797d','f256622d3d2a032bff43007be9c5b387','7d4a3e18db18b55a108f74384a98a2db'),
  ('1ba23cc01ca6269100ea2a4bd23faa4a48e530c8ed7574e65a5c4b9d5842caa7','L2824080042','longchamp','8ce52c58d9c86085fbe55dab24733f0c0ba4989c540e56709e441d69ba48f836','0f2e4e88ec4f3bf7526ae52992ac672d','83c6d3b7c3e8d5138af4b40dc5e73b76'),
  ('605b47f1eb808f260da7b98c8fbaa47a02521fc7680ea0f6d129c054983aab56','L2824080127','longchamp','f060cc4b4356a48ea4dc214a33b97d27fb390ac49540c8d469e9b6fb7d84c40c','f0953c144686e612804f5f0cbad68121','b4d0dd379f194f28a18696fdc29b1c00');

create temporary table arabic_before on commit drop as select * from jwl_internal.derive_product_variants();

CREATE OR REPLACE FUNCTION jwl_internal.derive_product_variants()
 RETURNS TABLE(product_id text, model_key text, is_primary boolean, "position" integer, model_name jsonb, options jsonb, specs jsonb, rule text, candidate_id text, revision_hash text, compared jsonb, basis jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with original as materialized (
with base as materialized (
  select d.* from jwl_internal.derive_base_variants() d
), base_models as (
  select b.model_key,count(*) n from base b group by b.model_key
), rows as materialized (
  -- Only a cleanly mapped row can join a size family: a grouped model, or a single with nothing wrong. Facts come
  -- from the base specs, which hold only the exact published revision's facts.
  select b.product_id id,b.model_key bkey,b.rule brule,b."position" bpos,b.model_name bname,b.specs,
    p.reference collate "C" reference,p.category_slug,p.collection_slug,p.name_en,p.name_ar,k.source_id,k.content->>'source_description' sd,
    sp.diameter,sp.diameter_ar,sp.material,sp.colour_en,sp.colour_ar
  from base b join public.jwl_catalog p on p.id=b.product_id join jwl_internal.candidates k on k.candidate_id=b.product_id
  cross join lateral (select max(s->'value'->>'en') filter (where s->>'kind'='diameter') diameter,max(s->'value'->>'ar') filter (where s->>'kind'='diameter') diameter_ar,
      max(s->'value'->>'en') filter (where s->>'kind'='material') material,
      max(s->'value'->>'en') filter (where s->>'kind' in ('colour','dial')) colour_en,max(s->'value'->>'ar') filter (where s->>'kind' in ('colour','dial')) colour_ar
    from jsonb_array_elements(b.specs) s) sp
  where b.rule not like 'single:%' or b.rule in ('single:only-variant','single:no-linking-evidence')
), named as (
  -- Names without the reference and, for a single, without a recorded colour tail, as the base rules strip them.
  select r.*,
    case when r.colour_en is not null and lower(right(x.noref_en,length(r.colour_en)+3)) in (lower(' — '||r.colour_en),lower(' – '||r.colour_en),lower(' - '||r.colour_en))
      then left(x.noref_en,length(x.noref_en)-length(r.colour_en)-3) else x.noref_en end core_en,
    case when r.brule not like 'single:%' then r.bname->>'ar'
      when r.colour_ar is not null and right(x.noref_ar,length(r.colour_ar)+2)='، '||r.colour_ar then left(x.noref_ar,length(x.noref_ar)-length(r.colour_ar)-2)
      else x.noref_ar end core_ar
  from rows r cross join lateral (select
    case when length(r.name_en)>length(r.reference) and right(r.name_en,length(r.reference))=r.reference then rtrim(left(r.name_en,length(r.name_en)-length(r.reference)),' -–—:,') else r.name_en end noref_en,
    case when length(r.name_ar)>length(r.reference) and right(r.name_ar,length(r.reference))=r.reference then rtrim(left(r.name_ar,length(r.name_ar)-length(r.reference)),' -–—:,،') else r.name_ar end noref_ar) x
), sized as (
  -- What each source states. A regexp_match that finds nothing still yields a row (NULL), so each branch requires a
  -- match. Rolex: the case diameter fact, the model line without its size, and the case type, case material and bezel
  -- that the source description of the exact reference states.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size' size_kind,n.diameter size_en,n.diameter size_label,n.diameter_ar size_ar,
    split_part(n.diameter,' ',1)::numeric size_rank,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[4],m[5],m[6]) design,nm[1]||' watch: '||nm[3] neutral_en,
    btrim(regexp_replace(case when n.diameter_ar is not null and right(n.core_ar,length(n.diameter_ar)+2)='، '||n.diameter_ar
      then left(n.core_ar,length(n.core_ar)-length(n.diameter_ar)-2) else n.core_ar end,' '||m[3]||'(?=$|،)','')) neutral_ar
  from named n
  cross join lateral regexp_match(n.sd,'^Discover the (.+?) ref\. (\S+) on Rolex\.com\. ([0-9]+) mm (.+?) case in (.+?), (.+?) bezel, (.+?) dial\. (.+?) bracelet in (.+)$') m
  cross join lateral regexp_match(n.core_en,'^(.+) ([0-9]+) watch: (.+)$') nm
  where n.source_id='rolex-official' and m is not null and nm is not null and m[2]=n.reference and n.diameter=m[3]||' mm' and nm[2]=m[3]
  union all
  -- LOEWE: a leading size word in the official name; the rest of the name and the material must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[1],m[1],t.term_ar,
    array_position(array['Nano','Micro','Mini','Small','Medium','Large','XL'],m[1]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[2],n.material),upper(left(m[2],1))||substr(m[2],2),null
  from named n cross join lateral regexp_match(n.core_en,'^(Nano|Micro|Mini|Small|Medium|Large|XL) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=m[1]
  where n.source_id='loewe-official' and m is not null
  union all
  -- Longchamp: the size letter between the line and the item type.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[2],m[2],null,
    array_position(array['XXS','XS','S','M','L','XL','XXL'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(.+) (XXS|XS|S|M|L|XL|XXL) (.+)$') m
  where n.source_id='longchamp-official' and m is not null
  union all
  -- Prada: a size word inside a named line ("Prada Galleria small ..."). Prada records no colour names, so the
  -- reference's material and colour codes must match as well.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,initcap(m[2]),initcap(m[2]),t.term_ar,
    array_position(array['nano','micro','mini','small','medium','large'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material,split_part(n.reference,'_',2),split_part(n.reference,'_',3)),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(Prada [^ ]+(?: [^ ]+)*?) (nano|micro|mini|small|medium|large) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=initcap(m[2])
  where n.source_id='prada-official' and m is not null and n.reference ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+(_|$)'
  union all
  -- Cartier and Van Cleef & Arpels: the maker's "<size> model" in both names; the rest of the name and the source
  -- description (its materials), without that phrase, must match. This is the maker's model size, not a fit size.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'model_size',lower(m[2])||' model',upper(left(m[2],1))||lower(substr(m[2],2))||' model',
    substring(n.core_ar from '، (الموديل [^،]+)'),
    case lower(m[2]) when 'extra small' then 1 when 'extra-small' then 1 when 'mini' then 2 when 'small' then 3 when 'medium' then 4 when 'classic' then 4 when 'large' then 5 else 6 end,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],coalesce(m[3],''),btrim(regexp_replace(coalesce(n.sd,''),', '||m[2]||' model','','i'))),m[1]||coalesce(m[3],''),
    regexp_replace(n.core_ar,'، الموديل [^،]+','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), (extra small|extra-small|mini|small|medium|classic|large|extra large|extra-large) model(, .+)?$','i') m
  where n.source_id in ('cartier-official','van-cleef-and-arpels-official') and m is not null and n.core_ar ~ '، الموديل [^،]+'
  union all
  -- Van Cleef & Arpels watches: "<name>, NN mm"; the description without that diameter must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size',m[2]||' mm',m[2]||' mm',jwl_internal.arabic_measure(m[2]||' mm'),m[2]::numeric,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],btrim(regexp_replace(coalesce(n.sd,''),'\m'||m[2]||' mm\M','','g'))),m[1],
    regexp_replace(n.core_ar,'، '||m[2]||' مم$','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), ([0-9]+) mm$') m
  where n.source_id='van-cleef-and-arpels-official' and m is not null
), arabic as (
  -- Bag and leather-goods names: the size phrase or adjective is removed from the Arabic base name.
  select s.*,coalesce(s.neutral_ar,btrim(regexp_replace(regexp_replace(s.core_ar,'، مقاس [^،]+',''),' (صغيرة|صغير|كبيرة|كبير|متوسطة|متوسط|ميني|نانو|مايكرو)( جداً)?(?=،|$)',''))) nar
  from sized s
), per_model as (
  select bkey,count(*) parsed,count(distinct (design,size_en)) shapes from arabic group by bkey
), complete as (
  -- A base model joins only whole: every member parsed exactly once, all to the same design and size.
  select a.* from arabic a join per_model pm on pm.bkey=a.bkey join base_models bm on bm.model_key=a.bkey where bm.n=pm.parsed and pm.shapes=1
), per_size as (
  select source_id,design,size_en,count(distinct bkey) n from complete group by 1,2,3
), designs as (
  select c.source_id,c.design,count(distinct c.size_en) sizes,bool_and(p.n=1) one_per_size,count(distinct c.nar) ar_names,count(distinct c.neutral_en) en_names
  from complete c join per_size p using(source_id,design,size_en) group by 1,2
), members as (
  -- A family: one design, two or more sizes, exactly one base model per size, one English and one Arabic name.
  select c.* from complete c join designs d using(source_id,design) where d.sizes>1 and d.one_per_size and d.ar_names=1 and d.en_names=1
), option_cells as (
  -- The family's other options: each recorded option fact of the source that varies within it (as in the base rules).
  select m.id,m.source_id,m.design,u.e->>'kind' kind,u.e->'label' label,u.e->'value' value,u.e->>'value_lang' value_lang,(u.e->'value'->>'en') collate "C" en,u.ord
  from members m join base b on b.product_id=m.id cross join lateral jsonb_array_elements(b.specs) with ordinality u(e,ord)
  where u.e->>'kind' = any(case m.source_id when 'rolex-official' then array['dial','bracelet','bracelet_material']
    when 'loewe-official' then array['colour'] when 'longchamp-official' then array['colour'] else array[]::text[] end)
), varying as (
  select source_id,design,kind from option_cells group by 1,2,3 having count(distinct en)>1
), need as (
  select source_id,design,count(*) n from varying group by 1,2
), have as (
  select o.id,count(*) n,string_agg(o.en,' | ' order by o.ord) vals from option_cells o join varying v using(source_id,design,kind) group by o.id
), checked as (
  select m.*,coalesce(nd.n,0) need_n,coalesce(h.n,0) have_n,m.size_en||' | '||coalesce(h.vals,'') tuple
  from members m left join need nd using(source_id,design) left join have h on h.id=m.id
), unresolved as (
  -- Every member records each varying option, and no two members carry the same size and options.
  select source_id,design from checked group by 1,2 having bool_or(have_n<>need_n) or count(*)<>count(distinct tuple)
), grouped as (
  select c.*,(row_number() over (partition by c.source_id,c.design order by c.size_rank,c.size_en,c.bpos,c.reference)-1)::integer pos,d.sizes n_sizes
  from checked c join designs d using(source_id,design) where not exists(select 1 from unresolved u where u.source_id=c.source_id and u.design=c.design)
), cells as (
  select o.*,btrim(regexp_replace(lower(o.en),'[^a-z0-9]+','-','g'),'-') slug
  from option_cells o join varying v using(source_id,design,kind) join grouped g on g.id=o.id
), keyed as (
  -- Two different values with the same slug get a hash suffix so every key stays unique.
  select c.*,min(c.en) over w<>max(c.en) over w shared from cells c window w as (partition by c.source_id,c.design,c.kind,c.slug)
), opts as (
  select k.id,jsonb_agg(jsonb_build_object('kind',k.kind,'label',k.label,'value',k.value,
      'key',case when k.slug<>'' and not k.shared then k.slug when k.slug<>'' then k.slug||'-'||left(md5(k.en),8) else left(md5(k.en),12) end)
    ||case when k.value_lang is not null then jsonb_build_object('value_lang',k.value_lang) else '{}'::jsonb end order by k.ord) o
  from keyed k group by k.id
), family_rows as (
  select g.id product_id,g.source_id||':size:'||left(md5(g.design),16) model_key,g.pos=0 is_primary,g.pos "position",
    jsonb_build_object('ar',g.nar,'en',g.neutral_en) model_name,
    jsonb_build_array(jsonb_build_object('kind',g.size_kind,
        'label',case g.size_kind when 'case_size' then '{"ar":"قطر العلبة","en":"Case diameter"}'::jsonb when 'bag_size' then '{"ar":"مقاس الحقيبة","en":"Bag size"}'::jsonb
          when 'model_size' then '{"ar":"حجم الموديل","en":"Model size"}'::jsonb else '{"ar":"المقاس","en":"Size"}'::jsonb end,
        'value',jsonb_build_object('ar',coalesce(g.size_ar,g.size_label),'en',g.size_label),
        'key',btrim(regexp_replace(lower(g.size_en),'[^a-z0-9]+','-','g'),'-'))
      ||case when g.size_ar is null then '{"value_lang":"en"}'::jsonb else '{}'::jsonb end)||coalesce(op.o,'[]'::jsonb) options,
    b.specs,
    case g.source_id when 'rolex-official' then 'rolex-size-family' when 'loewe-official' then 'loewe-size-family' when 'longchamp-official' then 'longchamp-size-family'
      when 'prada-official' then 'prada-size-family' when 'cartier-official' then 'cartier-size-family' else 'van-cleef-size-family' end rule,
    b.candidate_id,b.revision_hash,
    b.compared||jsonb_build_object('size',g.size_en,'design',g.design) compared,
    jsonb_build_object('base_model_key',g.bkey,'base_rule',g.brule,'size_kind',g.size_kind,'family_sizes',g.n_sizes,'base',b.basis) basis
  from grouped g join base b on b.product_id=g.id left join opts op on op.id=g.id
), reasons as (
  -- Why a row that states a size was not grouped, kept in its private evidence for the coverage report.
  select a.id,case when c.id is null then 'incomplete-base-model' when d.sizes<2 then 'one-size' when not d.one_per_size then 'several-models-per-size'
      when d.ar_names>1 or d.en_names>1 then 'name-mismatch' else 'options-unresolved' end reason
  from arabic a left join complete c on c.id=a.id left join designs d on d.source_id=c.source_id and d.design=c.design
  where not exists(select 1 from family_rows f where f.product_id=a.id)
)
select f.* from family_rows f
union all
select b.product_id,b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule,b.candidate_id,b.revision_hash,b.compared,
  case when r.reason is null then b.basis else b.basis||jsonb_build_object('size_check',r.reason) end
from base b left join (select distinct on (id) id,reason from reasons order by id,reason) r on r.id=b.product_id
where not exists(select 1 from family_rows f where f.product_id=b.product_id)
), requested(code, pinned_signature) as (values
  ('126300','dab0f3e56d78b5044dcf03297bbd6098'),
  ('126303','f6bd6014036bce8a1c5c2fb945759836'),
  ('128348rbr','f21d457004b950bfe2f4784c3aaf17ab'),
  ('128349rbr','fe0f8453c1e3c20945690cd231ca7529'),
  ('128395tbr','f63050937a3c6b2d744ebac491e23539'),
  ('128398tbr','643cb806a78bc47ec145ffde3160320d'),
  ('128399tbr','e8d82433255ce31c9cf3556ead8e198b'),
  ('228348rbr','a21320e3418271543dc895b8000b8ee8'),
  ('228398tbr','239b0daa793dc71bdb82aeccb0a60728'),
  ('278275','cd3537d02a2998086ab9c861bfccabc4'),
  ('278278','8d691c679d4834dc94e6839cf492424a'),
  ('278285rbr','ae9d1e1b1aff5d4ca6dd198299ada2d6'),
  ('278288rbr','21f79397b5ce0ee189e3e461989c9c83'),
  ('278289rbr','dbf50f869ca6a10a9dd76423b22b0302'),
  ('278341rbr','fc03d8ac7be45c591ebf13ca61721970'),
  ('278343rbr','222aebff9c36f425061d4c90371a662e'),
  ('279135rbr','1d2eb977e57af684078415533e957121'),
  ('279138rbr','c78ea3ff3f14a2ebc6757068afb668db'),
  ('279139rbr','a846b79c91be58c087162231c6087dd4'),
  ('279160','fe285449dedcaaa9e85fd53ebc53c910'),
  ('279161','bfe189e637a950d889428cdfa480d0cf'),
  ('279163','b01c0671a2bb0ef96bdcaaec426aa275'),
  ('279171','20282b467ae8996e93183ed097b34264'),
  ('279173','603d9034fac8b260c143a5eabd67e5f6'),
  ('279174','5d412a784840ea2d51a11485b576459a'),
  ('279175','1a06cce027055b4e83805f8a84a3f05d'),
  ('279178','e1ae38b62ccaf28fe51c750b3c84447d'),
  ('279381rbr','b7ae302d2af5c0c89726fbf3639d8e9a'),
  ('279383rbr','8b6582d8bf8219e811ef31bc4f0859e6'),
  ('279384rbr','72fd2ba8a2eae85a17ca4f1937ebed83')
), official as materialized (
  select d.*,p.reference,p.slug,q.code,q.pinned_signature,
    jsonb_build_array(p.id,p.reference,p.slug,p.name_ar,p.name_en,c.revision_hash,c.content->>'source_url',to_jsonb(d)) evidence
  from original d
  join public.jwl_catalog p on p.id=d.product_id
  join requested q on q.code=substring(p.reference from '^m([0-9a-z]+)-[0-9]{4}$')
  join jwl_internal.candidates c on c.candidate_id=p.id and c.revision_hash=d.revision_hash
  left join jwl_internal.factual_publications f on f.catalog_id=p.id
  left join jwl_internal.published_revisions r on r.catalog_id=p.id
  where p.active and p.brand_slug='rolex' and c.source_id='rolex-official'
    and c.revision_hash in (f.revision_hash,r.revision_hash)
    and c.external_id=p.reference
    and lower(c.content->>'source_url') ~ '^https://www[.]rolex[.]com/[^/]+/watches/[^/]+/m[0-9a-z]+-[0-9]{4}$'
    and regexp_replace(c.content->>'source_url','^.*/','')=p.reference
), cohorts as materialized (
  select code,count(*) n,count(*) filter(where rule='single:ambiguous-options') held,
    min(product_id) filter(where rule='rolex-model-number' and is_primary) primary_id,
    min(pinned_signature) pinned_signature,md5(jsonb_agg(evidence order by reference collate "C")::text) signature
  from official
  group by code
  having count(*) between 2 and 60
    and count(*) = count(*) filter(where rule='single:ambiguous-options' or (rule='rolex-model-number' and model_key='rolex-official:'||code))
    and count(*) filter(where rule='rolex-model-number' and is_primary)=1
    and count(*) filter(where rule='single:ambiguous-options')>0
    and count(distinct compared)=1
), selected as materialized (
  select o.*,g.n,g.primary_id,
    row_number() over(partition by o.code order by (o.product_id=g.primary_id) desc, (o.rule='rolex-model-number') desc, o."position", o.reference collate "C")::int-1 new_position
  from official o join cohorts g on g.code=o.code and g.signature=g.pinned_signature
), attributes as materialized (
  select s.product_id,s.code,j.spec,axis.ord,j.spec->>'kind' kind,j.spec->'value'->>'en' meaning
  from selected s
  cross join lateral jsonb_array_elements(s.specs) j(spec)
  join (values ('dial',1),('bracelet',2),('bracelet_material',3)) axis(kind,ord) on axis.kind=j.spec->>'kind'
), varying as (
  select code,kind from attributes group by code,kind having count(distinct meaning)>1
), original_keys as (
  select o.code,j.option->>'kind' kind,j.option->'value'->>'en' meaning,min(j.option->>'key') key
  from selected o cross join lateral jsonb_array_elements(o.options) j(option)
  where o.rule='rolex-model-number'
  group by 1,2,3
), built as (
  select a.product_id,jsonb_agg(a.spec||jsonb_build_object('key',coalesce(k.key,'source-'||md5(a.meaning))) order by a.ord) options
  from attributes a join varying v using(code,kind) left join original_keys k using(code,kind,meaning)
  group by a.product_id
), replacement as materialized (
  select s.product_id,'rolex-official:'||s.code model_key,s.product_id=s.primary_id is_primary,s.new_position "position",
    p.model_name,coalesce(b.options,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'kind','reference','key',s.reference,'label',jsonb_build_object('ar','المرجع','en','Reference'),
      'value',jsonb_build_object('ar',s.reference,'en',s.reference),'value_lang','en')) options,
    s.specs,'rolex-model-number'::text rule,s.candidate_id,s.revision_hash,s.compared,
    s.basis||jsonb_build_object('exact_reference_option',true,'reviewed_model_code',s.code,'group_size',s.n) basis
  from selected s join selected p on p.product_id=s.primary_id
  left join built b on b.product_id=s.product_id
), proposed as (
  select * from replacement
  union all
  select o.* from original o where not exists(select 1 from replacement r where r.product_id=o.product_id)
)
select * from proposed;
$function$;

create temporary table arabic_after on commit drop as select * from jwl_internal.derive_product_variants();

do $guard$
begin
  if exists (
    with delta as (
      select coalesce(b.product_id,a.product_id) id, md5(jsonb_build_array(b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule)::text) old_signature, md5(jsonb_build_array(a.model_key,a.is_primary,a."position",a.model_name,a.options,a.specs,a.rule)::text) new_signature,
        (to_jsonb(b)-'options') is not distinct from (to_jsonb(a)-'options') protected_same
      from pg_temp.arabic_before b full join pg_temp.arabic_after a using(product_id)
      where to_jsonb(b) is distinct from to_jsonb(a)
    )
    select 1 from delta d full join pg_temp.arabic_expected e using(id)
    left join public.jwl_catalog p on p.id=e.id
    left join public.jwl_product_variants v on v.product_id=e.id
    left join jwl_internal.variant_evidence ve on ve.product_id=e.id
    left join pg_temp.arabic_before b on b.product_id=e.id
    where d.id is null or e.id is null or p.reference is distinct from e.ref or p.brand_slug is distinct from e.brand
      or b.revision_hash is distinct from e.revision or not d.protected_same
      or d.old_signature is distinct from e.old_signature or d.new_signature is distinct from e.new_signature
      or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.old_signature
      or (ve.model_key,ve.rule,ve.candidate_id,ve.revision_hash,ve.compared,ve.basis)
        is distinct from (b.model_key,b.rule,b.candidate_id,b.revision_hash,b.compared,b.basis)
  ) then raise exception 'Arabic option derivation drifted from 138 reviewed rows'; end if;
end $guard$;

update public.jwl_product_variants v
set options=a.options
from pg_temp.arabic_expected e join pg_temp.arabic_after a on a.product_id=e.id
where v.product_id=e.id;

do $guard$
begin
  if exists (
    select 1 from pg_temp.arabic_expected e left join public.jwl_product_variants v on v.product_id=e.id
    where v.product_id is null or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.new_signature
  ) then raise exception 'Arabic options differ after the update'; end if;
end $guard$;
commit;
